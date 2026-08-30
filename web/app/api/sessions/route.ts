import { ensureDatabase } from '@/db/runtime';
import { getDb } from '@/db';
import { CATALOG_VERSION } from '@/domain/exercises';

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json().catch(() => ({})) as { sessionId?: string; runId?: string };
  const requested = body.sessionId && SESSION_ID.test(body.sessionId) ? body.sessionId : null;
  const sessionId = requested ?? crypto.randomUUID();
  const now = new Date().toISOString();

  await getDb().prepare(`
    INSERT INTO anonymous_sessions (id, created_at, last_seen_at) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET last_seen_at=excluded.last_seen_at
  `).bind(sessionId, now, now).run();

  const requestedRun = body.runId && SESSION_ID.test(body.runId) ? body.runId : null;
  const existingRun = requestedRun
    ? await getDb().prepare('SELECT id FROM training_runs WHERE id = ? AND session_id = ? AND catalog_version = ?')
        .bind(requestedRun, sessionId, CATALOG_VERSION).first<{ id: string }>()
    : null;
  const runId = existingRun?.id ?? crypto.randomUUID();
  if (!existingRun) {
    await getDb().prepare('INSERT INTO training_runs (id, session_id, started_at, catalog_version) VALUES (?, ?, ?, ?)')
      .bind(runId, sessionId, now, CATALOG_VERSION).run();
  }

  return Response.json({ sessionId, runId, catalogVersion: CATALOG_VERSION }, { headers: { 'Cache-Control': 'no-store' } });
}
