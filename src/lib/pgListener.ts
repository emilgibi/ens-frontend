// import { Client } from 'pg';
// import { dispatch } from './pgBus';
//
// function buildConnectionString(): string {
//   if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
//
//   if (!process.env.DATABASE_NAME && process.env.DATABASE__DB) {
//     (process.env as any).DATABASE_NAME = process.env.DATABASE__DB;
//   }
//
//   const host = process.env.DATABASE_HOST;
//   const port = process.env.DATABASE_PORT;
//   const user = process.env.DATABASE_USER;
//   const password = process.env.DATABASE_PASSWORD;
//   const dbName = process.env.DATABASE_NAME;
//
//   if (!host || !port || !user || !password || !dbName) {
//     throw new Error('Missing required database environment variables for PostgreSQL listener');
//   }
//
//   const sslMode = process.env.DATABASE_SSL?.toLowerCase() === 'false' ? '' : '?sslmode=require';
//   return `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${dbName}${sslMode}`;
// }
//
// function resolveSsl() {
//   if (process.env.DATABASE_SSL?.toLowerCase() === 'false') return false;
//   const rejectUnauthorized = process.env.DATABASE_SSL_STRICT === 'true';
//   return { rejectUnauthorized } as any;
// }
//
// const g = global as any;
//
// export async function startListener() {
//   if (g.__PG_LISTENER_STARTED__) return;
//
//   try {
//     const connectionString = buildConnectionString();
//     console.log('[PG Listener] Initializing PostgreSQL listener...');
//
//     const client = new Client({ connectionString, ssl: resolveSsl() });
//     g.__PG_LISTENER_CLIENT__ = client;
//
//     await client.connect();
//     console.log('[PG Listener] Connected to PostgreSQL');
//
//     await client.query('LISTEN session_id_status_channel');
//     await client.query('LISTEN ens_id_status_channel');
//     console.log('[PG Listener] Subscribed to notification channels');
//
//     client.on('notification', (msg) => {
//       if (
//           msg.channel === 'session_id_status_channel' ||
//           msg.channel === 'ens_id_status_channel'
//       ) {
//         try {
//           const payload = JSON.parse(msg.payload || '{}');
//           console.log(`[PG Listener] Received on ${msg.channel}:`, msg.payload);
//           dispatch(payload); // ✅ uses pgBus — always the same shared array
//         } catch (e) {
//           console.error('[PG Listener] Invalid payload:', e);
//         }
//       }
//     });
//
//     client.on('error', (err) => {
//       console.error('[PG Listener] error:', err);
//       g.__PG_LISTENER_STARTED__ = false;
//     });
//
//     client.on('end', () => {
//       console.log('[PG Listener] connection ended');
//       g.__PG_LISTENER_STARTED__ = false;
//     });
//
//     g.__PG_LISTENER_STARTED__ = true;
//     console.log('[PG Listener] Listener ready ✅');
//   } catch (error) {
//     console.error('[PG Listener] Failed to start:', error);
//     g.__PG_LISTENER_STARTED__ = false;
//     throw error;
//   }
// }
//
// export function subscribe(fn: (data: any) => void) {
//   return addSubscriber(fn);
// }
//
// import { addSubscriber } from './pgBus';

export {};