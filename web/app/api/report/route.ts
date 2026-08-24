import { getDb } from '@/db';
import { ensureDatabase } from '@/db/runtime';

type AttemptRow = { group_correct: number; reasons_correct: number; all_correct: number; error_tag: string | null };

export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get('runId');
  if (!runId) return Response.json({ error: 'run_required' }, { status: 400 });
  await ensureDatabase();
  const rows = (await getDb().prepare(`
    SELECT group_correct, reasons_correct, all_correct, error_tag FROM attempts
    WHERE run_id = ? ORDER BY created_at
  `).bind(runId).all<AttemptRow>()).results;

  const attemptCount = rows.length;
  const groupPoints = rows.reduce((sum, row) => sum + (row.group_correct ? 1 : 0), 0);
  const reasonPoints = rows.reduce((sum, row) => sum + (row.reasons_correct ? 1 : 0), 0);
  const accuracy = attemptCount ? Math.round((rows.filter((row) => row.all_correct).length / attemptCount) * 100) : 0;
  return Response.json({
    attemptCount, accuracy,
    firstErrorTag: rows.find((row) => row.error_tag)?.error_tag ?? null,
    groupAccuracy: attemptCount ? Math.round((groupPoints / attemptCount) * 100) : 0,
    reasonAccuracy: attemptCount ? Math.round((reasonPoints / attemptCount) * 100) : 0,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
