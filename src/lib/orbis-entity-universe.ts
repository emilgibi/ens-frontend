import { cookies } from 'next/headers';

/**
 * Orbis has no equivalent of Probe42's `entity_universe` table — every one
 * of its supplier-data endpoints (get-supplier-data,
 * get-main-supplier-data-compiled) is scoped to a single session_id. There
 * is no "every entity ever screened, across all sessions" endpoint.
 *
 * To build an Entity Universe view for the international pipeline, this
 * helper fetches every international session (via
 * GET /supplier/get-session-screening-status, which has no non-session
 * filter and returns all of them), then fetches that session's entities
 * (via GET /supplier/get-main-supplier-data-compiled) for each one, and
 * merges the results — deduplicating by ens_id and keeping the most
 * recently updated occurrence, since the same company can be re-screened
 * across multiple sessions.
 *
 * This does one HTTP call per session on every request. Fine at realistic
 * session volumes; would need real caching or a proper backend aggregate
 * endpoint if session counts get very large.
 */

const MAX_SESSIONS = 1000;
const MAX_ROWS_PER_SESSION = 1000;

async function getMoodysAuth(): Promise<{ backendBase: string; token: string } | null> {
  const backendBase = process.env.NEXT_PUBLIC_MOODYS_BACKEND;
  if (!backendBase) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get('moodys_access_token')?.value;
  if (!token) return null;

  return { backendBase, token };
}

async function fetchAllInternationalSessionIds(
  backendBase: string,
  token: string,
): Promise<string[]> {
  try {
    const url = new URL(`${backendBase}/supplier/get-session-screening-status`);
    url.searchParams.set('page_no', '1');
    url.searchParams.set('rows_per_page', String(MAX_SESSIONS));
    // No screening_analysis_status filter — "" (default) means all sessions,
    // not just active ones, which is what a universe view needs.

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];

    const raw = await res.json();
    const inner = raw?.data ?? raw;
    const rows: any[] = Array.isArray(inner) ? inner : (inner?.data ?? []);
    return rows.map((r) => r.session_id).filter(Boolean);
  } catch (err) {
    console.error('[orbis-entity-universe] failed to list sessions:', err);
    return [];
  }
}

async function fetchEntitiesForSession(
  sessionId: string,
  backendBase: string,
  token: string,
): Promise<Record<string, any>[]> {
  try {
    const url = new URL(`${backendBase}/supplier/get-main-supplier-data-compiled`);
    url.searchParams.set('session_id', sessionId);
    url.searchParams.set('page_no', '1');
    url.searchParams.set('rows_per_page', String(MAX_ROWS_PER_SESSION));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 404 just means this session has no compiled entities yet (e.g. still
    // uploading/validating) — not an error worth logging.
    if (!res.ok) return [];

    const raw = await res.json();
    const inner = raw?.data ?? raw;
    return Array.isArray(inner) ? inner : (inner?.data ?? []);
  } catch (err) {
    console.error(`[orbis-entity-universe] failed to fetch entities for session ${sessionId}:`, err);
    return [];
  }
}

async function fetchEntityRating(
  ensId: string,
  backendBase: string,
  token: string,
): Promise<string | null> {
  try {
    const res = await fetch(`${backendBase}/graph/get-submodal-profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ens_id: ensId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Same shape as Probe42's compile_company_profile (identical function,
    // both backends): { profile, ratings: { supplier: 'high'|'medium'|'low', ... }, metadata }
    return data?.ratings?.supplier ?? null;
  } catch {
    return null;
  }
}

export type RiskCounts = { high: number; medium: number; low: number };

/**
 * Orbis's /graph/get-submodal-profile is byte-for-byte the same function
 * (compile_company_profile / pull_ratings, reading from a table literally
 * called "ovar") as Probe42's equivalent — which the domestic frontend
 * already relies on for data.ratings.supplier ('high'/'medium'/'low').
 * There's no local table to aggregate the way rating-card.tsx does for
 * Probe42, so this calls the per-entity endpoint once per entity and
 * buckets the results. This is a second N+1 layer on top of the one in
 * getAllInternationalEntities (one call per session, one call per
 * entity) — fine for realistic entity counts, would need real caching
 * or a backend aggregate endpoint at scale.
 */
export async function getInternationalRiskCounts(
  entities: Record<string, any>[],
): Promise<RiskCounts> {
  const auth = await getMoodysAuth();
  if (!auth) return { high: 0, medium: 0, low: 0 };
  const { backendBase, token } = auth;

  const ratings = await Promise.all(
    entities
      .map((e) => e['ens_id'])
      .filter(Boolean)
      .map((ensId) => fetchEntityRating(ensId, backendBase, token)),
  );

  const counts: RiskCounts = { high: 0, medium: 0, low: 0 };
  for (const rating of ratings) {
    const normalized = rating?.toLowerCase();
    if (normalized === 'high') counts.high++;
    else if (normalized === 'medium') counts.medium++;
    else if (normalized === 'low') counts.low++;
  }
  return counts;
}

export async function getAllInternationalEntities(): Promise<Record<string, any>[]> {
  const auth = await getMoodysAuth();
  if (!auth) return [];
  const { backendBase, token } = auth;

  const sessionIds = await fetchAllInternationalSessionIds(backendBase, token);
  if (sessionIds.length === 0) return [];

  const entityLists = await Promise.all(
    sessionIds.map((sessionId) => fetchEntitiesForSession(sessionId, backendBase, token)),
  );

  const byEnsId = new Map<string, Record<string, any>>();
  for (const rows of entityLists) {
    for (const row of rows) {
      const ensId = row['ens_id'];
      if (!ensId) continue;
      const existing = byEnsId.get(ensId);
      const rowUpdated = new Date(row['update_time'] ?? 0).getTime();
      const existingUpdated = existing ? new Date(existing['update_time'] ?? 0).getTime() : -Infinity;
      if (!existing || rowUpdated > existingUpdated) {
        byEnsId.set(ensId, row);
      }
    }
  }

  return Array.from(byEnsId.values());
}