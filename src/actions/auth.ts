'use server';

import { createSession, deleteSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { LoginFormData } from '@/lib/definitions';
import { getUserByEmail } from '@/lib/dal';

export type ActionResponse = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  error?: string;
  username?: string;
  userId?: string;
};

type BackendLoginResult = {
  ok: boolean;
  status: number;
  accessToken?: string;
  message?: string;
};

const LOGIN_TIMEOUT_MS = 10_000;

async function loginToBackend(
  backendUrl: string | undefined,
  pipelineLabel: string,
  data: LoginFormData,
): Promise<BackendLoginResult> {
  if (!backendUrl) {
    return {
      ok: false,
      status: 500,
      message: `${pipelineLabel} backend URL is not configured`,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

  try {
    const response = await fetch(`${backendUrl.replace(/\/$/, '')}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
      signal: controller.signal,
    });

    const body = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message:
          body?.detail ||
          body?.message ||
          `${pipelineLabel} login failed with status ${response.status}`,
      };
    }

    return { ok: true, status: response.status, accessToken: body?.access_token };
  } catch (error) {
    // AbortController throws a DOMException named "AbortError" when the
    // timeout fires — surface that as a clear "unreachable" message
    // instead of the login form just spinning forever, which is what
    // happened before this timeout existed whenever one of the two
    // backends wasn't actually running.
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      status: 500,
      message: isTimeout
        ? `${pipelineLabel} backend did not respond within ${LOGIN_TIMEOUT_MS / 1000}s — is it running?`
        : error instanceof Error
          ? `${pipelineLabel} login error: ${error.message}`
          : `${pipelineLabel} login: unable to reach backend`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function signIn(data: LoginFormData): Promise<ActionResponse> {
  try {
    // Probe42 (domestic) backend. Reuses the existing envs — this is the
    // pipeline that already worked before dual-pipeline support existed.
    const probe42BackendUrl =
      process.env.SERVER_APPLICATION_BACKEND ||
      process.env.NEXT_PUBLIC_APPLICATION_BACKEND;

    // Orbis / Moody's (international) backend. Needs its own SERVER_*
    // (server-side, not exposed to the browser) env var — add
    // SERVER_MOODYS_BACKEND to .env alongside SERVER_APPLICATION_BACKEND.
    const moodysBackendUrl =
      process.env.SERVER_MOODYS_BACKEND || process.env.NEXT_PUBLIC_MOODYS_BACKEND;

    // Login is only considered complete once BOTH backends return 200 —
    // each one issues its own JWT (signed with its own secret) and one
    // token is never valid against the other backend.
    const [probe42Result, moodysResult] = await Promise.all([
      loginToBackend(probe42BackendUrl, 'Probe42', data),
      loginToBackend(moodysBackendUrl, "Orbis/Moody's", data),
    ]);

    if (!probe42Result.ok || !moodysResult.ok) {
      const failures = [
        !probe42Result.ok ? probe42Result.message : null,
        !moodysResult.ok ? moodysResult.message : null,
      ].filter(Boolean);

      return {
        success: false,
        message: failures.join(' | ') || 'Login failed',
        error: 'Failed to sign in',
      };
    }

    const user = await getUserByEmail(data.email);
    await createSession(user[0].userId, user[0].userGroup, {
      probe42Token: probe42Result.accessToken as string,
      moodysToken: moodysResult.accessToken as string,
    });

    return {
      success: true,
      username: user[0].username,
      userId: user[0].userId,
      message: 'Signed in successfully',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      error: 'Failed to sign in',
    };
  }
}

export async function signOut(): Promise<void> {
  try {
    await deleteSession();
  } catch (error) {
    throw new Error('Failed to sign out');
  } finally {
    redirect('/login');
  }
}