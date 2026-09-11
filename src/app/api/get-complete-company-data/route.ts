import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * POST /api/get-complete-company-data
 *
 * Proxies to the orchestration backend:
 *   POST NEXT_PUBLIC_APPLICATION_ORCHESTRATION/get-complete-company-data
 *
 * The orch endpoint requires Bearer auth — we forward the session access token.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Forward the access token from the session cookie so the orch backend
    // can authenticate via deps.get_current_user
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('probe42_access_token')?.value
      ?? req.headers.get('authorization')?.replace('Bearer ', '');

    const orchestrationBase = process.env.SERVER_APPLICATION_ORCHESTRATION || process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION;
    const orchUrl = `${orchestrationBase}/get-complete-company-data`;

    const orchRes = await fetch(orchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const contentType = orchRes.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: `Orchestration service returned non-JSON (${orchRes.status})` },
        { status: 502 },
      );
    }

    const data = await orchRes.json();

    if (!orchRes.ok) {
      return NextResponse.json(
        { error: data?.detail?.message ?? data?.message ?? 'Orchestration request failed' },
        { status: orchRes.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    // A closed/unreachable orchestration service surfaces here as a plain
    // fetch failure (Node's undici throws "fetch failed" with the real
    // reason on `.cause`), which used to reach the browser as an opaque
    // "Internal server error" — no indication that nothing was even
    // listening. Surface the actual cause and which URL was attempted.
    const causeCode = err?.cause?.code ?? err?.code;
    const isConnFailure = causeCode === 'ECONNREFUSED' || causeCode === 'ENOTFOUND' || causeCode === 'ETIMEDOUT' || err?.message === 'fetch failed';
    const orchestrationBase = process.env.SERVER_APPLICATION_ORCHESTRATION || process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION;
    return NextResponse.json(
      {
        error: isConnFailure
          ? `Cannot reach the orchestration service at ${orchestrationBase ?? '(URL not configured)'}${causeCode ? ` (${causeCode})` : ''} — is ens-orchestration-probe42 running?`
          : (err?.message ?? 'Internal server error'),
      },
      { status: isConnFailure ? 503 : 500 },
    );
  }
}