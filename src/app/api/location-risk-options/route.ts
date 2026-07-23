import { NextResponse } from 'next/server';

const ORCH = process.env.SERVER_APPLICATION_ORCHESTRATION || process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION;

/**
 * GET /api/location-risk-options
 *
 * Proxies GET {ORCH}/location-risk/available-locations — the full list of
 * districts with static risk data, each flagged with which dimensions
 * (political/climate/infrastructure) actually cover it. Powers the
 * Location360 search autocomplete instead of free text, since most
 * district names typed blind have no data in either source at all.
 *
 * The underlying data comes from two static files (thinkhzrd.csv,
 * ACLED_updated.xlsx) that don't change between deploys, so this is safe
 * to cache for a while rather than re-fetching from the orchestration on
 * every keystroke's page load.
 */
export async function GET() {
  try {
    const upstream = await fetch(`${ORCH}/location-risk/available-locations`, {
      // The backend now auto-detects when thinkhzrd.csv/ACLED_updated.xlsx
      // change (mtime-based cache) and needs no restart to pick up new
      // districts. A short cache here just avoids re-fetching on every
      // page load without masking updates for long.
      next: { revalidate: 300 },
    });

    const text = await upstream.text();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${upstream.status}: ${text.slice(0, 200)}`, locations: [] },
        { status: upstream.status },
      );
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error', locations: [] },
      { status: 500 },
    );
  }
}
