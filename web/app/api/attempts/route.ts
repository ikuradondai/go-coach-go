import { getDb } from '@/db';
import { getExerciseDefinition } from '@/db/runtime';
import type { GroupId } from '@/domain/training';

type AttemptBody = {
  sessionId?: string;
  runId?: string;
  exerciseId?: string;
  selectedGroup?: GroupId;
  selectedReasons?: string[];
  responseMs?: number;
};

const REASON_IDS = new Set(['eye', 'escape', 'count', 'context']);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as AttemptBody | null;
  if (!body?.sessionId || !body.runId || !body.exerciseId || !['a', 'b'].includes(body.selectedGroup ?? '') ||
      !Array.isArray(body.selectedReasons) || body.selectedReasons.some((id) => !REASON_IDS.has(id))) {
    return Response.json({ error: 'invalid_attempt' }, { status: 400 });
  }

  const exercise = await getExerciseDefinition(body.exerciseId);
  if (!exercise) return Response.json({ error: 'exercise_not_found' }, { status: 404 });

  const db = getDb();
  const session = await db.prepare('SELECT id FROM anonymous_sessions WHERE id = ?').bind(body.sessionId).first();
  if (!session) return Response.json({ error: 'session_not_found' }, { status: 404 });
  const run = await db.prepare('SELECT id FROM training_runs WHERE id = ? AND session_id = ?')
    .bind(body.runId, body.sessionId).first();
  if (!run) return Response.json({ error: 'run_not_found' }, { status: 404 });

  const selected = [...new Set(body.selectedReasons)].sort();
  const expected = [...exercise.correctReasons].sort();
  const groupCorrect = body.selectedGroup === exercise.correctGroup;
  const reasonsCorrect = selected.length === expected.length && selected.every((id, index) => id === expected[index]);
  const errorTag = groupCorrect && reasonsCorrect ? null : exercise.errorTag;
  const now = new Date().toISOString();
  const responseMs = Math.max(0, Math.min(Math.round(body.responseMs ?? 0), 30 * 60 * 1000));

  const statements = [
    db.prepare(`INSERT INTO attempts
      (id, session_id, run_id, exercise_id, exercise_version, selected_group, selected_reasons_json,
       group_correct, reasons_correct, response_ms, error_tag, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), body.sessionId, body.runId, exercise.id, exercise.version, body.selectedGroup,
        JSON.stringify(selected), groupCorrect ? 1 : 0, reasonsCorrect ? 1 : 0, responseMs, errorTag, now),
    db.prepare('UPDATE anonymous_sessions SET last_seen_at = ? WHERE id = ?').bind(now, body.sessionId),
  ];

  for (const tag of exercise.correctReasons) {
    const success = selected.includes(tag);
    statements.push(db.prepare(`INSERT INTO skill_estimates
      (session_id, tag, alpha, beta, sample_count, updated_at) VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(session_id, tag) DO UPDATE SET
        alpha=alpha+excluded.alpha-1, beta=beta+excluded.beta-1,
        sample_count=sample_count+1, updated_at=excluded.updated_at`)
      .bind(body.sessionId, tag, success ? 2 : 1, success ? 1 : 2, now));
  }
  await db.batch(statements);

  return Response.json({
    groupCorrect, reasonsCorrect, correctGroup: exercise.correctGroup,
    conclusion: exercise.conclusion, principle: exercise.principle,
    explanations: exercise.explanations, boardNotes: exercise.boardNotes, errorTag,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
