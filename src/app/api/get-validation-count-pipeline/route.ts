import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/get-validation-count-pipeline?sessionId=...&screeningType=...
 *
 * The original /api/get-validation-count reads lib/dal.ts's getValidationCount,
 * which queries the frontend's OWN Postgres (uploadSupplierData table). That
 * table is only ever populated for the domestic/Probe42 pipeline — Orbis
 * writes session data into a completely separate database
 * (pg-ens-orbis-dev), so that query returns zero rows for every
 * international session, no matter how long you wait.
 *
 * This proxy instead asks the pipeline-correct backend directly (same
 * GET /supplier/get-supplier-data used by get-validation-results-pipeline)
 * and computes the same three buckets from the live response, using each
 * backend's actual enum values (FinalValidatedStatus / DUPINSESSION in
 * app/models.py — identical strings in both ens-backend-probe42 and
 * coe-ens-application-backend-orbis).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const screeningType = searchParams.get('screeningType') ?? 'domestic';

    const emptyCounts = {
      directMatchFoundCount: 0,
      requiresReviewCount: 0,
      duplicateOrNoMatchCount: 0,
    };

    if (!sessionId) {
      return Response.json(emptyCounts);
    }

    // Server-to-server call — prefer SERVER_* (private/localhost)
    // over NEXT_PUBLIC_* (public-facing, meant for the browser). On a
    // cloud VM these can differ: NEXT_PUBLIC_* often points at the VM's
    // public IP so the browser can reach it, but a server process on
    // that same VM calling its own public IP frequently hangs/fails
    // (no hairpin NAT on many cloud providers, Azure included).
    const backendBase =
      screeningType === 'international'
        ? (process.env.SERVER_MOODYS_BACKEND || process.env.NEXT_PUBLIC_MOODYS_BACKEND)
        : (process.env.SERVER_APPLICATION_BACKEND || process.env.NEXT_PUBLIC_PROBE42_BACKEND);

    if (!backendBase) {
      return Response.json(
        { error: `Backend URL not configured for screening type: ${screeningType}` },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get(
      screeningType === 'international' ? 'moodys_access_token' : 'probe42_access_token',
    )?.value;

    // The backend enforces rows_per_page <= 1000 (Query(10, le=1000) in
    // app/api/endpoints/supplier.py) — asking for more, as the original
    // version of this route did, gets the whole request rejected with a
    // 422 before it even runs. Page through in batches of 1000 instead so
    // sessions with more rows than that still get accurate counts.
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 50; // safety cap: 50k rows is far beyond any realistic single session
    const rows: Record<string, unknown>[] = [];
    let pageNo = 1;

    while (pageNo <= MAX_PAGES) {
      const upstreamUrl = new URL(`${backendBase}/supplier/get-supplier-data`);
      upstreamUrl.searchParams.set('session_id', sessionId);
      upstreamUrl.searchParams.set('page_no', String(pageNo));
      upstreamUrl.searchParams.set('rows_per_page', String(PAGE_SIZE));

      const upstream = await fetch(upstreamUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!upstream.ok) {
        // A 404 here just means "no rows for this session (yet)" — treat
        // that as zero counts rather than an error, same as before.
        if (upstream.status === 404) break;
        const err = await upstream.text();
        console.error(`[get-validation-count-pipeline] upstream ${upstream.status}:`, err);
        return Response.json(emptyCounts, { status: upstream.status });
      }

      const raw = await upstream.json();
      const inner = raw?.data ?? raw;
      const pageRows: Record<string, unknown>[] = Array.isArray(inner) ? inner : (inner?.data ?? []);
      const totalData: number = inner?.total_data ?? raw?.total_data ?? pageRows.length;

      rows.push(...pageRows);

      if (pageRows.length < PAGE_SIZE || rows.length >= totalData) {
        break;
      }
      pageNo++;
    }

    let directMatchFoundCount = 0;
    let requiresReviewCount = 0;
    let duplicateOrNoMatchCount = 0;

    for (const row of rows) {
      const finalValidationStatus = row['final_validation_status'];
      const duplicateInSession = row['duplicate_in_session'];
      const validationStatus = row['validation_status'];

      if (finalValidationStatus === 'AUTO_ACCEPT') {
        directMatchFoundCount++;
      } else if (finalValidationStatus === 'REVIEW') {
        requiresReviewCount++;
      } else if (
        (finalValidationStatus === 'AUTO_REJECT' && duplicateInSession === 'REMOVE') ||
        (finalValidationStatus === 'AUTO_REJECT' && validationStatus === 'NOT_VALIDATED')
      ) {
        duplicateOrNoMatchCount++;
      }
    }

    return Response.json({
      directMatchFoundCount,
      requiresReviewCount,
      duplicateOrNoMatchCount,
    });
  } catch (err: any) {
    console.error('[get-validation-count-pipeline] error:', err);
    return Response.json(
      {
        directMatchFoundCount: 0,
        requiresReviewCount: 0,
        duplicateOrNoMatchCount: 0,
        error: err?.message ?? 'Internal server error',
      },
      { status: 500 },
    );
  }
}
