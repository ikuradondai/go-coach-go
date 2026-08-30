import { env } from 'cloudflare:workers';

export function getDb(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is not configured');
  return env.DB;
}

export function getFiles(): R2Bucket {
  if (!env.FILES) throw new Error('R2 binding FILES is not configured');
  return env.FILES;
}

export function getKataGoConfig() {
  return {
    url: env.KATAGO_API_URL?.replace(/\/$/, '') ?? '',
    token: env.KATAGO_API_TOKEN ?? '',
  };
}
