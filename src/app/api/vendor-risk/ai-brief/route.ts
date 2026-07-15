import { NextRequest, NextResponse } from 'next/server';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('probe42_access_token')?.value
      ?? req.headers.get('authorization')?.replace('Bearer ', '');

    const orchestrationBase = process.env.SERVER_APPLICATION_ORCHESTRATION || process.env.NEXT_PUBLIC_APPLICATION_ORCHESTRATION;
    const orchRes = await fetch(`${orchestrationBase}/vendor-risk/ai-brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
    });

    const ct = orchRes.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return NextResponse.json({ error: `Orch returned ${orchRes.status}` }, { status: 502 });
    const data = await orchRes.json();
    if (!orchRes.ok) return NextResponse.json({ error: data?.detail ?? 'AI brief failed' }, { status: orchRes.status });
    return NextResponse.json(data, { status: 200 });
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}