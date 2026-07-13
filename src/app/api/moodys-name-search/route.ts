import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/moodys-name-search?orgName=...
 *
 * Proxies to Moody's orchestration:
 *   GET NEXT_PUBLIC_MOODYS_ORCHESTRATION/moodys/nameSearch?orgName=...
 *
 * Mirror of /api/probe42-name-search but pointed at the Moody's
 * orchestration. The entity-validation step calls this when
 * screeningType === 'international'.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgName = searchParams.get('orgName') ?? '';

    if (orgName.trim().length < 3) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get('moodys_access_token')?.value ??
      req.headers.get('authorization')?.replace('Bearer ', '');

    const moodysOrchBase = process.env.NEXT_PUBLIC_MOODYS_ORCHESTRATION;
    if (!moodysOrchBase) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_MOODYS_ORCHESTRATION is not configured' },
        { status: 500 },
      );
    }

    const orchUrl = `${moodysOrchBase}/moodys/nameSearch?orgName=${encodeURIComponent(orgName.trim())}`;

    const orchRes = await fetch(orchUrl, {
      method: 'GET',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    const contentType = orchRes.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: `Orchestration returned status ${orchRes.status}` },
        { status: 502 },
      );
    }

    const data = await orchRes.json();

    if (!orchRes.ok) {
      return NextResponse.json(
        { error: data?.detail?.message ?? data?.message ?? "Moody's name search failed" },
        { status: orchRes.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}
