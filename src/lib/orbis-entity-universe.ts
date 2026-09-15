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
 * merges the results — deduplicating by bvd_id (a fresh ens_id is minted
 * on every screening, even for a company already screened before, so
 * ens_id itself is not a stable per-company key), preferring a COMPLETED
 * row over a SKIPPED one and otherwise keeping the most recently updated
 * occurrence, since the same company can be re-screened across multiple
 * sessions.
 *
 * This does one HTTP call per session on every request. Fine at realistic
 * session volumes; would need real caching or a proper backend aggregate
 * endpoint if session counts get very large.
 */

const MAX_SESSIONS = 1000;
const MAX_ROWS_PER_SESSION = 1000;

async function getMoodysAuth(): Promise<{ backendBase: string; token: string } | null> {
  const backendBase = process.env.SERVER_MOODYS_BACKEND || process.env.NEXT_PUBLIC_MOODYS_BACKEND;
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

export type EntityRatings = {
  supplier?: string;
  entity_existence?: string;
  financials?: string;
  adverse_media?: string;
  legal?: string;
  cyber_esg?: string;
  [key: string]: string | undefined;
};

/**
 * Fetches the FULL ratings object for one entity via Orbis's
 * /graph/get-submodal-profile — the same endpoint and same
 * compile_company_profile()/pull_ratings() functions that power the
 * eye-icon overview sheet, and the same shape Probe42's equivalent
 * /universe/get-submodal-profile returns. Returns null on any failure
 * (missing data, network error, etc.) rather than throwing, since this
 * is used to enrich list/table rows where one bad entity shouldn't break
 * the whole page.
 */
async function fetchEntityRatings(
  ensId: string,
  backendBase: string,
  token: string,
): Promise<EntityRatings | null> {
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
    return data?.ratings ?? null;
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
      .map((ensId) => fetchEntityRatings(ensId, backendBase, token)),
  );

  const counts: RiskCounts = { high: 0, medium: 0, low: 0 };
  for (const r of ratings) {
    const normalized = r?.supplier?.toLowerCase();
    if (normalized === 'high') counts.high++;
    else if (normalized === 'medium') counts.medium++;
    else if (normalized === 'low') counts.low++;
  }
  return counts;
}

/**
 * Fetches full KPI ratings (entity_existence, financials, adverse_media,
 * legal, cyber_esg — the same 5 shown in the eye-icon overview sheet) for
 * a specific set of entities, keyed by ens_id. Unlike
 * getInternationalRiskCounts (which needs every entity to compute an
 * accurate distribution), this is meant to be called with just the
 * entities on the current table page — e.g. 10 at a time — so the N+1
 * cost stays small on every page load instead of scaling with the full
 * entity universe.
 */
export async function getEntityRatingsBulk(
  ensIds: string[],
): Promise<Record<string, EntityRatings | null>> {
  const auth = await getMoodysAuth();
  if (!auth) return {};
  const { backendBase, token } = auth;

  const results = await Promise.all(
    ensIds.map(async (ensId) => [ensId, await fetchEntityRatings(ensId, backendBase, token)] as const),
  );

  return Object.fromEntries(results);
}

// Status rank used when deduping re-screened entities below: a SKIPPED row
// (cooldown hit, no analysis actually ran) must never shadow an older
// COMPLETED row that has real report data, even if it's more recent.
// Ties (e.g. two COMPLETED rows) fall back to update_time recency.
const STATUS_RANK: Record<string, number> = {
  COMPLETED: 2,
  IN_PROGRESS: 1,
  SKIPPED: 0,
};

function statusRank(status: string | undefined): number {
  return STATUS_RANK[status ?? ''] ?? 1;
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

  // Keyed by bvd_id, not ens_id: the backend mints a brand-new ens_id on
  // every single screening (even re-screening the exact same company), so
  // the same real-world company can have many ens_id rows across sessions,
  // all sharing one bvd_id. bvd_id is the only stable identifier for "this
  // is the same company" — dedupe on that, falling back to ens_id only for
  // the rare row where bvd_id hasn't been populated yet.
  const byKey = new Map<string, Record<string, any>>();
  for (const rows of entityLists) {
    for (const row of rows) {
      const ensId = row['ens_id'];
      if (!ensId) continue;
      const bvdId = (row['bvd_id'] ?? '').toString().trim().toUpperCase();
      const key = bvdId || ensId;
      const existing = byKey.get(key);
      const rowRank = statusRank(row['overall_status']);
      const existingRank = existing ? statusRank(existing['overall_status']) : -1;
      const rowUpdated = new Date(row['update_time'] ?? 0).getTime();
      const existingUpdated = existing ? new Date(existing['update_time'] ?? 0).getTime() : -Infinity;
      if (!existing || rowRank > existingRank || (rowRank === existingRank && rowUpdated > existingUpdated)) {
        byKey.set(key, row);
      }
    }
  }

  return Array.from(byKey.values());
}
