import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * GET /api/probe42-name-search?orgName=...
 * Proxies → ORCH /probe42/nameSearch?orgName=...
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgName = searchParams.get('orgName') ?? '';

    if (orgName.length < 3) {
      return NextResponse.json({ results: [] }, { status: 200 });
    }

    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get('probe42_access_token')?.value ??
      req.headers.get('authorization')?.replace('Bearer ', '');

    const orchestrationBase = process.env.SERVER_APPLICATION_ORCHESTRATION || process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION;
    const orchUrl = `${orchestrationBase}/probe42/nameSearch?orgName=${encodeURIComponent(orgName)}`;

    const orchRes = await fetch(orchUrl, {
      method: 'GET',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    });

    const contentType = orchRes.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json({ error: `Orch returned ${orchRes.status}` }, { status: 502 });
    }

    const data = await orchRes.json();
    if (!orchRes.ok) {
      return NextResponse.json(
        { error: data?.detail?.message ?? 'Name search failed' },
        { status: orchRes.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal server error' }, { status: 500 });
  }
}