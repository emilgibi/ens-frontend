import { cookies } from 'next/headers';
import * as jose from 'jose';
import { cache } from 'react';

interface JWTPayload {
  userId: string;
  userGroup: string;
  [key: string]: string | number | boolean | null | undefined;
}

const JWT_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET);

export async function generateJWT(payload: JWTPayload) {
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);

  const expiresAt = Math.floor(midnight.getTime() / 1000);

  return await new jose.SignJWT({
    iss: 'my-app',
    sub: payload.userId,
    exp: expiresAt,
    iat: Math.floor(Date.now() / 1000),
    ugr: payload.userGroup,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(JWT_SECRET);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Real bearer tokens issued by each pipeline's own backend /auth/login.
// Each backend signs its JWT with its own secret, so a token from one is
// never valid on the other — they must be requested, stored, and sent
// separately. `access_token` (below) stays a separate, app-issued session
// cookie used only to gate Next.js routes in middleware.ts; it is never
// sent to either backend.
export type PipelineTokens = {
  probe42Token: string;
  moodysToken: string;
};

export async function createSession(
  userId: string,
  userGroup: string,
  pipelineTokens?: PipelineTokens,
) {
  try {
    const token = await generateJWT({ userId, userGroup });

    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === 'production';
    const commonOptions = {
      httpOnly: false,
      secure: isProd,
      maxAge: 60 * 60 * 24 * 1,
      path: '/',
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    };

    cookieStore.set({ name: 'access_token', value: token, ...commonOptions });

    if (pipelineTokens?.probe42Token) {
      cookieStore.set({
        name: 'probe42_access_token',
        value: pipelineTokens.probe42Token,
        ...commonOptions,
      });
    }

    if (pipelineTokens?.moodysToken) {
      cookieStore.set({
        name: 'moodys_access_token',
        value: pipelineTokens.moodysToken,
        ...commonOptions,
      });
    }

    return true;
  } catch (error) {
    console.error('Error creating session:', error);
    return false;
  }
}

export const getSession = cache(async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('access_token')?.value;

    if (!token) return null;
    const payload = await verifyJWT(token);

    return payload ? { userId: payload.userId } : null;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('During prerendering, `cookies()` rejects')
    ) {
      console.log(
        'Cookies not available during prerendering, returning null session',
      );
      return null;
    }

    console.error('Error getting session:', error);
    return null;
  }
});

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete('access_token');
  cookieStore.delete('probe42_access_token');
  cookieStore.delete('moodys_access_token');
}
