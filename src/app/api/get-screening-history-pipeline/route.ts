import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { ne } from 'drizzle-orm';

import { db } from '@/db';
import { sessionScreeningStatus } from '@/drizzle/schema';

/**
 * POST /api/get-screening-history-pipeline?page=1&pageSize=10&sortBy=createTime&sortOrder=desc
 *
 * The original /api/get-session-info (lib/dal.ts getSessionInfo) only ever
 * queries the frontend's own local Postgres (session_screening_status
 * table). That table is only ever written to by the Probe42/domestic
 * backend — Orbis writes its own session_screening_status rows into
 * pg-ens-orbis-dev, a completely separate database the frontend never
 * connects to. So Screening History has only ever been able to show
 * domestic sessions, no matter how many international ones exist.
 *
 * This proxy fetches domestic sessions directly (same table/filter as
 * getSessionInfo) AND international sessions from the Orbis backend's own
 * GET /supplier/get-session-screening-status, merges them, sorts by
 * createTime, and paginates the combined list.
 *
 * Known limitations (documented rather than silently hidden):
 * - Orbis's list endpoint doesn't return source/sourceId/failedEnsCount,
 *   so international rows show reasonable defaults for those instead of
 *   real values. Getting real values would mean an extra per-session call
 *   for every international row in the list, which doesn't scale here.
 * - Filters sent from the table's filter UI are only applied to the
 *   merged, in-memory result set (screeningType / overallStatus), not
 *   pushed down as a query to either source. Fine at realistic session
 *   volumes; would need a real fix if session counts get very large.
 */

const MAX_ROWS_PER_SOURCE = 500;

type MergedRow = {
  sessionId: string;
  createTime: string;
  overallStatus: string;
  source: string;
  sourceId: string | null;
  failedEnsCount: number | null;
  screeningType: 'domestic' | 'international';
};

async function fetchDomesticRows(): Promise<MergedRow[]> {
  const rows = await db
    .select()
    .from(sessionScreeningStatus)
    .where(ne(sessionScreeningStatus.screeningAnalysisStatus, 'NOT_STARTED'))
    .limit(MAX_ROWS_PER_SOURCE);

  return rows.map((row: any) => ({
    sessionId: row.sessionId,
    createTime: row.createTime,
    overallStatus: row.overallStatus,
    source: row.source,
    sourceId: row.sourceId ?? null,
    failedEnsCount: row.failedEnsCount ?? 0,
    screeningType: 'domestic' as const,
  }));
}

async function fetchInternationalRows(): Promise<MergedRow[]> {
  const backendBase = process.env.NEXT_PUBLIC_MOODYS_BACKEND;
  if (!backendBase) return [];

  const cookieStore = await cookies();
  const token = cookieStore.get('moodys_access_token')?.value;
  if (!token) return [];

  try {
    const url = new URL(`${backendBase}/supplier/get-session-screening-status`);
    url.searchParams.set('page_no', '1');
    url.searchParams.set('rows_per_page', String(MAX_ROWS_PER_SOURCE));
    // Deliberately no screening_analysis_status filter — "" means "all",
    // and Screening History should show completed sessions too, not just
    // active ones.

    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!upstream.ok) {
      // 404 here just means "no international sessions yet" — not an error.
      return [];
    }

    const raw = await upstream.json();
    const inner = raw?.data ?? raw;
    const rows: any[] = Array.isArray(inner) ? inner : (inner?.data ?? []);

    return rows
      .filter((row) => row.overall_status !== 'NOT_STARTED')
      .map((row) => ({
        sessionId: row.session_id,
        createTime: row.create_time,
        overallStatus: row.overall_status,
        // Not returned by this endpoint — 'NU' (New Upload) is the
        // overwhelmingly common case for how sessions get created today.
        source: 'NU',
        sourceId: null,
        failedEnsCount: 0,
        screeningType: 'international' as const,
      }));
  } catch (err) {
    console.error('[get-screening-history-pipeline] failed to fetch international sessions:', err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get('page') ?? '1');
    const pageSize = Number(searchParams.get('pageSize') ?? '10');
    const sortOrder = searchParams.get('sortOrder') ?? 'desc';

    let filters: Record<string, string | string[]> = {};
    try {
      const body = await req.json();
      filters = body?.filters ?? {};
    } catch {
      // no body / not JSON — fine, just means no filters
    }

    const [domesticRows, internationalRows] = await Promise.all([
      fetchDomesticRows(),
      fetchInternationalRows(),
    ]);

    let merged = [...domesticRows, ...internationalRows];

    // Best-effort filtering on the merged set (see limitations above).
    const screeningTypeFilter = filters['screeningType'];
    if (screeningTypeFilter) {
      const wanted = Array.isArray(screeningTypeFilter) ? screeningTypeFilter : [screeningTypeFilter];
      merged = merged.filter((row) => wanted.includes(row.screeningType));
    }
    const statusFilter = filters['overallStatus'];
    if (statusFilter) {
      const wanted = Array.isArray(statusFilter) ? statusFilter : [statusFilter];
      merged = merged.filter((row) => wanted.includes(row.overallStatus));
    }
    const sourceFilter = filters['source'];
    if (sourceFilter) {
      const wanted = Array.isArray(sourceFilter) ? sourceFilter : [sourceFilter];
      merged = merged.filter((row) => wanted.includes(row.source));
    }

    merged.sort((a, b) => {
      const diff = new Date(a.createTime).getTime() - new Date(b.createTime).getTime();
      return sortOrder === 'asc' ? diff : -diff;
    });

    const totalRecords = merged.length;
    const start = (page - 1) * pageSize;
    const data = merged.slice(start, start + pageSize);

    return Response.json({ data, totalRecords });
  } catch (err: any) {
    console.error('[get-screening-history-pipeline] error:', err);
    return Response.json(
      { data: [], totalRecords: 0, error: err?.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}