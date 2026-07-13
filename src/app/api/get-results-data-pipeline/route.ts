import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/get-results-data-pipeline?session_id=...&screening_type=...&page=1&pageSize=10
 *
 * results.tsx's original /api/results-data (lib/dal.ts getResultsData) joins
 * supplierMasterData + ensidScreeningStatus in the frontend's OWN Postgres —
 * same problem as everywhere else: that DB only ever holds Probe42/domestic
 * rows, Orbis writes to pg-ens-orbis-dev instead.
 *
 * Both backends expose the identical join server-side already:
 * GET /supplier/get-main-supplier-data-compiled joins supplier_master_data
 * with ensid_screening_status on (session_id, ens_id) — see
 * get_main_session_supplier_compiled() in each backend's
 * app/core/supplier/supplier.py. This proxy calls that instead, and
 * camelCases the response for results.tsx's existing SupplierCombinedStatus
 * accessors.
 */
function toCamelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function camelCaseRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[toCamelCase(key)] = value;
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    const screeningType = searchParams.get('screening_type') ?? 'domestic';
    const page = searchParams.get('page') ?? '1';
    const pageSize = searchParams.get('pageSize') ?? '10';

    if (!sessionId) {
      return Response.json({ data: [], totalRecords: 0 });
    }

    const backendBase =
      screeningType === 'international'
        ? process.env.NEXT_PUBLIC_MOODYS_BACKEND
        : process.env.NEXT_PUBLIC_PROBE42_BACKEND;

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

    // Same le=1000 cap as /supplier/get-supplier-data — stay under it.
    const cappedPageSize = Math.min(Number(pageSize) || 10, 1000);

    const upstreamUrl = new URL(`${backendBase}/supplier/get-main-supplier-data-compiled`);
    upstreamUrl.searchParams.set('session_id', sessionId);
    upstreamUrl.searchParams.set('page_no', page);
    upstreamUrl.searchParams.set('rows_per_page', String(cappedPageSize));

    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!upstream.ok) {
      // 404 here means "no results yet" (analysis still running) — treat
      // as an empty page rather than surfacing an error toast.
      if (upstream.status === 404) {
        return Response.json({ data: [], totalRecords: 0 });
      }
      const err = await upstream.text();
      console.error(`[get-results-data-pipeline] upstream ${upstream.status}:`, err);
      return Response.json(
        { data: [], totalRecords: 0, error: `Upstream error ${upstream.status}` },
        { status: upstream.status },
      );
    }

    const raw = await upstream.json();
    const inner = raw?.data ?? raw;
    const rows = Array.isArray(inner) ? inner : (inner?.data ?? []);
    const totalRecords = inner?.total_data ?? raw?.total_data ?? rows.length;

    return Response.json({
      data: rows.map((r: Record<string, unknown>) => camelCaseRow(r)),
      totalRecords,
    });
  } catch (err: any) {
    console.error('[get-results-data-pipeline] error:', err);
    return Response.json(
      { data: [], totalRecords: 0, error: err?.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}