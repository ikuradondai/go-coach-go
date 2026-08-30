declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    FILES: R2Bucket;
    KATAGO_API_URL?: string;
    KATAGO_API_TOKEN?: string;
    KATAGO_MONTHLY_JOB_LIMIT?: string;
  }
}
