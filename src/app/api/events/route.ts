export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { Client } from 'pg';
import { NextRequest } from 'next/server';
import { db } from '@/db';
import { ensidScreeningStatus, sessionScreeningStatus } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

function buildConnectionString(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (!process.env.DATABASE_NAME && process.env.DATABASE__DB) {
    (process.env as any).DATABASE_NAME = process.env.DATABASE__DB;
  }
  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const dbName = process.env.DATABASE_NAME;
  if (!host || !port || !user || !password || !dbName) throw new Error('Missing DB env vars');
  const ssl = process.env.DATABASE_SSL?.toLowerCase() === 'false' ? '' : '?sslmode=require';
  return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}${ssl}`;
}

function resolveSsl() {
  if (process.env.DATABASE_SSL?.toLowerCase() === 'false') return false;
  return { rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true' } as any;
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId');
  console.log(`\n[SSE] ▶ Client connected — sessionId: "${sessionId}"`);

  if (!sessionId) return new Response('Session ID is required', { status: 400 });

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let closed = false;

  const safeWrite = async (data: any) => {
    if (closed) return;
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      closed = true;
    }
  };

  // ── Step 1: send connected immediately ──────────────────────────────────
  await safeWrite({ type: 'connected' });

  // ── Step 2: open dedicated PG client — own LISTEN connection ────────────
  const pgClient = new Client({ connectionString: buildConnectionString(), ssl: resolveSsl() });
  try {
    await pgClient.connect();
    await pgClient.query('LISTEN session_id_status_channel');
    await pgClient.query('LISTEN ens_id_status_channel');
    console.log(`[SSE] ✅ PG LISTEN ready — sessionId: "${sessionId}"`);
  } catch (err) {
    console.error('[SSE] ❌ PG connect failed:', err);
  }

  // ── Step 3: send DB snapshot so missed events are recovered ─────────────
  try {
    const [sessionRow] = await db
        .select()
        .from(sessionScreeningStatus)
        .where(eq(sessionScreeningStatus.sessionId, sessionId));

    if (sessionRow) {
      await safeWrite({
        session_id: sessionRow.sessionId,
        overall_status: sessionRow.overallStatus,
        list_upload_status: sessionRow.listUploadStatus,
        supplier_name_validation_status: sessionRow.supplierNameValidationStatus,
        screening_analysis_status: sessionRow.screeningAnalysisStatus,
        total_ens_count: sessionRow.totalEnsCount,
        completed_ens_count: sessionRow.completedEnsCount,
        failed_ens_count: sessionRow.failedEnsCount,
        skipped_ens_count: sessionRow.skippedEnsCount,
      });
      console.log(`[SSE] 📤 Session snapshot sent — overall: ${sessionRow.overallStatus}`);
    }

    const ensRows = await db
        .select()
        .from(ensidScreeningStatus)
        .where(eq(ensidScreeningStatus.sessionId, sessionId));

    for (const ens of ensRows) {
      await safeWrite({
        session_id: ens.sessionId,
        ens_id: ens.ensId,
        overall_status: ens.overallStatus,
        orbis_retrieval_status: ens.orbisRetrievalStatus,
        screening_modules_status: ens.screeningModulesStatus,
        report_generation_status: ens.reportGenerationStatus,
      });
    }
    if (ensRows.length > 0) {
      console.log(`[SSE] 📤 ENS snapshot sent — ${ensRows.length} rows`);
    }
  } catch (err) {
    console.error('[SSE] ⚠ DB snapshot failed:', err);
  }

  // ── Step 4: forward live PG notifications to SSE stream ─────────────────
  pgClient.on('notification', (msg) => {
    if (
        msg.channel !== 'session_id_status_channel' &&
        msg.channel !== 'ens_id_status_channel'
    ) return;
    try {
      const payload = JSON.parse(msg.payload || '{}');
      if (payload.session_id !== sessionId) return;

      if (payload.ens_id) {
        console.log(`[SSE] 🔵 ENS → ens_id: ${payload.ens_id} | status: ${payload.overall_status}`);
      } else {
        console.log(`[SSE] 🟢 Session → overall: ${payload.overall_status} | screening: ${payload.screening_analysis_status}`);
      }
      safeWrite(payload);
    } catch (e) {
      console.error('[SSE] parse error:', e);
    }
  });

  pgClient.on('error', (err) => console.error('[SSE] PG error:', err));

  const pingInterval = setInterval(() => safeWrite({ type: 'ping' }), 15000);

  req.signal.addEventListener('abort', () => {
    closed = true;
    clearInterval(pingInterval);
    pgClient.end().catch(() => {});
    writer.close().catch(() => {});
    console.log(`[SSE] ���� Disconnected — sessionId: "${sessionId}"`);
  });

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}