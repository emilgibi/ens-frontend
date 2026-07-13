import { NextRequest, NextResponse } from 'next/server';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
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

    const orchUrl = API_ENDPOINTS.BACKEND.GET_COMPLETE_COMPANY_DATA;

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
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error' },
      { status: 500 },
    );
  }
}