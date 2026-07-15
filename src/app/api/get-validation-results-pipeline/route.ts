import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/get-validation-results-pipeline?session_id=...&screening_type=...&page=1&pageSize=10
 *
 * Same upstream call as /api/get-supplier-data-pipeline (both hit
 * GET /supplier/get-supplier-data on the pipeline-correct backend), but this
 * proxy camelCases the response. entity-validation.tsx's `Supplier` type and
 * all its column/cell accessors are camelCase (uploadedName, ensId,
 * finalValidationStatus, ...), unlike review-submission.tsx which was
 * switched to consume the raw snake_case shape directly. Keeping the
 * conversion here (rather than rewriting every accessor in
 * entity-validation.tsx) is the smaller, lower-risk change.
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

    const upstreamUrl = new URL(`${backendBase}/supplier/get-supplier-data`);
    upstreamUrl.searchParams.set('session_id', sessionId);
    upstreamUrl.searchParams.set('page_no', page);
    upstreamUrl.searchParams.set('rows_per_page', pageSize);

    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!upstream.ok) {
      const err = await upstream.text();
      console.error(`[get-validation-results-pipeline] upstream ${upstream.status}:`, err);
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
    console.error('[get-validation-results-pipeline] error:', err);
    return Response.json(
      { data: [], totalRecords: 0, error: err?.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
