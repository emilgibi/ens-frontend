import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, PoolConfig, PoolClient } from 'pg';

/**
 * Robust connection string builder.
 * Supports either DATABASE_URL or discrete vars (with a fallback alias for DATABASE__DB -> DATABASE_NAME).
 */
function buildConnectionString(): string | undefined {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  // Handle Kubernetes environment variable naming convention
  if (!process.env.DATABASE_NAME && process.env.DATABASE__DB) {
    (process.env as any).DATABASE_NAME = process.env.DATABASE__DB;
  }

  const host = process.env.DATABASE_HOST;
  const port = process.env.DATABASE_PORT;
  const user = process.env.DATABASE_USER;
  const password = process.env.DATABASE_PASSWORD;
  const dbName = process.env.DATABASE_NAME || process.env.DATABASE__DB;

  if (host && port && user && password && dbName) {
    const sslModeRequired = process.env.DATABASE_SSL?.toLowerCase() === 'false' ? '' : '?sslmode=require';
    return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}${sslModeRequired}`;
  }
  return undefined;
}

function resolveSslConfig(): PoolConfig['ssl'] {
  // Allow explicit disable
  if (process.env.DATABASE_SSL?.toLowerCase() === 'false') return false;
  // If global NODE_TLS_REJECT_UNAUTHORIZED=0 we still provide object so pg uses TLS but doesn't reject certs.
  const rejectUnauthorized = process.env.DATABASE_SSL_STRICT === 'true';
  return { rejectUnauthorized };
}

function explainCommonError(code?: string, message?: string): string | undefined {
  switch (code) {
    case '28P01':
      return 'Authentication failed (invalid user/password). Verify DATABASE_USER & DATABASE_PASSWORD.';
    case '3D000':
      return 'Database does not exist. Check DATABASE_NAME.';
    case 'ECONNREFUSED':
      return 'Connection refused. Host/port unreachable (firewall, network, or service down).';
    case 'ENOTFOUND':
      return 'Hostname not found. Check DATABASE_HOST DNS / spelling.';
    default:
      if (message?.includes('self signed certificate')) {
        return 'Self-signed certificate. Set DATABASE_SSL=false or provide proper certificate / set DATABASE_SSL_STRICT=false.';
      }
  }
}

// --- Global caching (Next.js hot reload / serverless reuse) ---
declare global {
  // eslint-disable-next-line no-var
  var __DB_POOL__: Pool | undefined;
  // eslint-disable-next-line no-var
  var __DB_DRIZZLE__: ReturnType<typeof drizzle> | undefined;
  // eslint-disable-next-line no-var
  var __DB_INITIALIZING__: boolean | undefined;
}

const connectionString = buildConnectionString();

function validateConfig(): string[] {
  const missing: string[] = [];
  if (!connectionString) {
    const required = [
      'DATABASE_HOST',
      'DATABASE_PORT',
      'DATABASE_USER',
      'DATABASE_PASSWORD',
    ];
    required.forEach((k) => { if (!process.env[k]) missing.push(k); });
    
    // Check for database name using either naming convention
    if (!process.env.DATABASE_NAME && !process.env.DATABASE__DB) {
      missing.push('DATABASE_NAME or DATABASE__DB');
    }
  }
  return missing;
}

const missing = validateConfig();
if (missing.length) {
  console.error(
    `[DB] Missing database configuration vars: ${missing.join(', ')}. Provide DATABASE_URL or the discrete variables.`,
  );
}

const poolConfig: PoolConfig = connectionString
  ? { connectionString, ssl: resolveSslConfig(), max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10 }
  : ({
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : undefined,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || process.env.DATABASE__DB,
      ssl: resolveSslConfig(),
      max: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10,
    } as any);

let pool: Pool | undefined = globalThis.__DB_POOL__;
let drizzleDb: ReturnType<typeof drizzle> | undefined = globalThis.__DB_DRIZZLE__;
let initializing = globalThis.__DB_INITIALIZING__ || false;

const DEBUG = process.env.DB_DEBUG === 'true';

function debugLog(...args: any[]) {
  if (DEBUG) console.log('[DB:DEBUG]', ...args);
}

async function testConnectivity(localPool: Pool) {
  const started = Date.now();
  try {
    const client = await localPool.connect();
    await client.query('select 1');
    client.release();
    console.log('[DB] Connectivity check succeeded in', Date.now() - started, 'ms');
  } catch (err: any) {
    const hint = explainCommonError(err.code, err.message);
    console.warn('[DB] Connectivity check failed:', err.code || err.message, hint ? `\n[DB] Hint: ${hint}` : '');
  }
}

function instrumentPool(p: Pool) {
  // Attach one-off listeners only once
  if ((p as any).__instrumented) return p;
  (p as any).__instrumented = true;

  p.on('error', (err) => {
    console.error('[DB] Unexpected PG pool error:', err);
  });
  p.on('connect', () => debugLog('PG client connected'));
  p.on('acquire', () => debugLog('PG client acquired'));

  // Monkey-patch query for timing / error hinting
  const originalQuery: typeof p.query = p.query.bind(p);
  (p as any).query = async (...qArgs: Parameters<typeof originalQuery>) => {
    const start = Date.now();
    try {
      const result = await (originalQuery as any).apply(p, qArgs as any);
      debugLog('query ok', { ms: Date.now() - start });
      return result;
    } catch (err: any) {
      const hint = explainCommonError(err.code, err.message);
      console.error('[DB] Query failed', {
        sql: typeof qArgs[0] === 'string' ? qArgs[0] : 'Prepared/Config object',
        durationMs: Date.now() - start,
        code: err.code,
        hint,
      });
      throw err;
    }
  };
  return p;
}

function createPoolIfNeeded() {
  if (!pool) {
    if (missing.length) {
      throw new Error('[DB] Cannot initialize pool: missing configuration variables.');
    }
    pool = instrumentPool(new Pool(poolConfig));
    globalThis.__DB_POOL__ = pool;
  }
  return pool;
}

function init() {
  if (!drizzleDb && !initializing) {
    initializing = true;
    globalThis.__DB_INITIALIZING__ = true;
    
    try {
      console.log('[DB] Initializing database connection...');
      const p = createPoolIfNeeded();
      drizzleDb = drizzle(p);
      globalThis.__DB_DRIZZLE__ = drizzleDb;
      
      const shouldCheck = process.env.DB_STARTUP_CHECK === 'true' || process.env.NODE_ENV !== 'production';
      if (shouldCheck) {
        console.log('[DB] Running startup connectivity check...');
        testConnectivity(p).finally(() => { /* noop */ });
      }
      
      console.log('[DB] Database initialization completed successfully');
    } catch (error) {
      console.error('[DB] Failed to initialize database:', error);
      throw error;
    } finally {
      initializing = false;
      globalThis.__DB_INITIALIZING__ = false;
    }
  }
  return drizzleDb!;
}

export function getPool() { return createPoolIfNeeded(); }

// Lazy proxy still exported as `db` (non-breaking)
export const db = new Proxy({}, {
  get(_target, prop) {
    const instance: any = init();
    return instance[prop as keyof typeof instance];
  },
  apply(_target, thisArg, argArray) {
    const instance: any = init();
    return instance.apply(thisArg, argArray);
  },
}) as unknown as ReturnType<typeof drizzle>;

export async function ensureDb() { return init(); }

/** Utility wrapper for safer query execution with contextual error logging */
export async function runQuery<T>(label: string, fn: (db: ReturnType<typeof drizzle>) => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const instance = init();
    const res = await fn(instance);
    debugLog(`runQuery:${label}`, 'ok', Date.now() - started, 'ms');
    return res;
  } catch (err: any) {
    const hint = explainCommonError(err.code, err.message);
    console.error(`[DB] runQuery failed: ${label}`, err.code || err.message, hint ? `\n[DB] Hint: ${hint}` : '');
    throw err;
  }
}
 