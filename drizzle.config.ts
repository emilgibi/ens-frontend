import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

// Handle Kubernetes environment variable naming convention
const databaseName = process.env.DATABASE_NAME || process.env.DATABASE__DB;

if (!databaseName) {
  throw new Error('DATABASE_NAME or DATABASE__DB environment variable is required');
}

export default defineConfig({
  out: './src/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DATABASE_HOST!,
    port: Number(process.env.DATABASE_PORT!),
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: databaseName,
    ssl: true,
  }
});
