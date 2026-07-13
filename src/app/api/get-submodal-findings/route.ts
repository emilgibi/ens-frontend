import { NextRequest, NextResponse } from 'next/server';
import { API_ENDPOINTS } from '@/constants/api-endpoints';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const token = cookieStore.get('probe42_access_token')?.value
      ?? req.headers.get('authorization')?.replace('Bearer ', '');

    const res = await fetch(API_ENDPOINTS.BACKEND.UNIVERSE_SUBMODAL_FINDINGS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: data?.detail ?? 'Findings fetch failed' }, { status: res.status });
    return NextResponse.json(data);
  } catch (e: any) { return NextResponse.json({ error: e?.message }, { status: 500 }); }
}