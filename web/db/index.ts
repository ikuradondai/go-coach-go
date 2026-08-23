import { env } from 'cloudflare:workers';

export function getDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is not configured');
  return env.DB;
}
