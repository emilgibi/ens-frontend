import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const backendUrl =
      process.env.SERVER_APPLICATION_BACKEND ||
      process.env.NEXT_PUBLIC_APPLICATION_BACKEND;

    if (!backendUrl) {
      throw new Error('SERVER_APPLICATION_BACKEND is not configured');
    }

    const response = await fetch(`${backendUrl.replace(/\/$/, '')}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({
      message: `Login service returned status ${response.status}`,
    }));

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error ? error.message : 'Unable to reach auth service',
      },
      { status: 500 },
    );
  }
}
