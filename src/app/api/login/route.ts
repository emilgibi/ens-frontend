import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { access_token } = await req.json();
    const cookieStore = await cookies();

    cookieStore.set('token', access_token, {
      httpOnly: false,
      sameSite: 'strict',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
    });

    return new Response('OK');
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}
