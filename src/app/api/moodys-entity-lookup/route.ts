/**
 * GET /api/moodys-entity-lookup?bvdId=CN156053221994
 *
 * International counterpart of /api/entity-universe-lookup. Orbis has no
 * entity_universe table to query directly (see lib/orbis-entity-universe.ts),
 * so this reuses the same session-aggregation helper the International
 * Overview table already relies on, and finds a match by bvd_id.
 * Used by Entity Analysis to auto-load ENS findings after picking an
 * international result from name search.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAllInternationalEntities } from '@/lib/orbis-entity-universe';

export async function GET(req: NextRequest) {
  try {
    const bvdId = req.nextUrl.searchParams.get('bvdId')?.trim();
    if (!bvdId) {
      return NextResponse.json({ found: false });
    }

    const entities = await getAllInternationalEntities();
    const match = entities.find(
      (e) => (e['bvd_id'] ?? '').toString().toUpperCase() === bvdId.toUpperCase(),
    );

    if (!match) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      ensId: match['ens_id'],
      sessionId: match['session_id'],
      name: match['name'],
      bvdId: match['bvd_id'],
    });
  } catch (e: any) {
    // Non-fatal — entity analysis still works without ENS data
    return NextResponse.json({ found: false, error: e?.message });
  }
}
