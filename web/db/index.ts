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
  const configuredLimit = Number(env.KATAGO_MONTHLY_JOB_LIMIT ?? 500);
  return {
    url: env.KATAGO_API_URL?.replace(/\/$/, '') ?? '',
    token: env.KATAGO_API_TOKEN ?? '',
    monthlyJobLimit: Number.isFinite(configuredLimit) ? Math.max(1, Math.floor(configuredLimit)) : 500,
  };
}
