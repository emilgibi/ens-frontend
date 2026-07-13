/**
 * GET /api/entity-universe-lookup?identifier=L27109TG1975PLC001919
 *
 * Looks up a screened entity by CIN/LLPIN/PAN and returns its ensId + lastSessionId.
 * Used by Entity Analysis to auto-load ENS findings after a manual Probe42 search.
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { entityUniverse } from '@/drizzle/schema';
import { eq, ilike } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const identifier = req.nextUrl.searchParams.get('identifier')?.trim();
    if (!identifier || identifier.length < 3) {
      return NextResponse.json({ found: false });
    }

    // Try exact match first, then case-insensitive
    const rows = await db
      .select({
        ensId:         entityUniverse.ensId,
        lastSessionId: entityUniverse.lastSessionId,
        name:          entityUniverse.name,
        identifier:    entityUniverse.identifier,
      })
      .from(entityUniverse)
      .where(ilike(entityUniverse.identifier, identifier))
      .limit(1);

    if (rows.length === 0) {
      return NextResponse.json({ found: false });
    }

    const row = rows[0];
    return NextResponse.json({
      found:         true,
      ensId:         row.ensId,
      sessionId:     row.lastSessionId,
      name:          row.name,
      identifier:    row.identifier,
    });
  } catch (e: any) {
    // Non-fatal — entity analysis still works without ENS data
    return NextResponse.json({ found: false, error: e?.message });
  }
}