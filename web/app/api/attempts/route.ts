import { getDb } from '@/db';
import { getExerciseDefinition } from '@/db/runtime';
import type { AnswerValue, ExerciseAnswers, ExerciseStage } from '@/domain/training';

type AttemptBody = {
  sessionId?: string;
  runId?: string;
  exerciseId?: string;
  answers?: ExerciseAnswers;
  responseMs?: number;
};

function allowedIds(stage: ExerciseStage) {
  if (stage.type === 'choose_move' || stage.type === 'compare_groups' || stage.type === 'select_group') return new Set(stage.candidates.map((item) => item.id));
  return new Set(stage.options.map((item) => item.id));
}

function isValidAnswer(stage: ExerciseStage, answer: AnswerValue | undefined) {
  const allowed = allowedIds(stage);
  if (stage.type === 'select_evidence') {
    return Array.isArray(answer) && answer.length >= (stage.minSelections ?? 1) &&
      answer.length === new Set(answer).size && answer.every((id) => allowed.has(id));
  }
  return typeof answer === 'string' && allowed.has(answer);
}

function expectedAnswer(stage: ExerciseStage): AnswerValue {
  return stage.type === 'select_evidence' ? stage.correctAnswers : stage.correctAnswer;
}

function isCorrect(stage: ExerciseStage, answer: AnswerValue) {
  const expected = expectedAnswer(stage);
  if (Array.isArray(expected)) {
    if (!Array.isArray(answer)) return false;
    const actual = [...answer].sort();
    const correct = [...expected].sort();
    return actual.length === correct.length && actual.every((id, index) => id === correct[index]);
  }
  return answer === expected;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as AttemptBody | null;
  if (!body?.sessionId || !body.runId || !body.exerciseId || !body.answers || typeof body.answers !== 'object') {
    return Response.json({ error: 'invalid_attempt' }, { status: 400 });
  }

  const exercise = await getExerciseDefinition(body.exerciseId);
  if (!exercise) return Response.json({ error: 'exercise_not_found' }, { status: 404 });
  if (exercise.stages.some((stage) => !isValidAnswer(stage, body.answers?.[stage.id]))) {
    return Response.json({ error: 'invalid_answers' }, { status: 400 });
  }

  const db = getDb();
  const session = await db.prepare('SELECT id FROM anonymous_sessions WHERE id = ?').bind(body.sessionId).first();
  if (!session) return Response.json({ error: 'session_not_found' }, { status: 404 });
  const run = await db.prepare('SELECT id FROM training_runs WHERE id = ? AND session_id = ?')
    .bind(body.runId, body.sessionId).first();
  if (!run) return Response.json({ error: 'run_not_found' }, { status: 404 });

  const stageResults = Object.fromEntries(exercise.stages.map((stage) => [stage.id, isCorrect(stage, body.answers![stage.id])]));
  const correctAnswers = Object.fromEntries(exercise.stages.map((stage) => [stage.id, expectedAnswer(stage)]));
  const allCorrect = Object.values(stageResults).every(Boolean);
  const groupStage = exercise.stages.find((stage) => stage.type === 'compare_groups' || stage.type === 'select_group');
  const evidenceStage = exercise.stages.find((stage) => stage.type === 'select_evidence');
  const selectedGroup = groupStage && typeof body.answers[groupStage.id] === 'string' ? body.answers[groupStage.id] as string : 'a';
  const selectedReasons = evidenceStage && Array.isArray(body.answers[evidenceStage.id]) ? body.answers[evidenceStage.id] as string[] : [];
  const groupCorrect = groupStage ? stageResults[groupStage.id] : allCorrect;
  const reasonsCorrect = evidenceStage ? stageResults[evidenceStage.id] : allCorrect;
  const errorTag = allCorrect ? null : exercise.diagnosticTags[0] ?? '判断手順を再確認';
  const now = new Date().toISOString();
  const responseMs = Math.max(0, Math.min(Math.round(body.responseMs ?? 0), 30 * 60 * 1000));

  const statements = [
    db.prepare(`INSERT INTO attempts
      (id, session_id, run_id, exercise_id, exercise_version, selected_group, selected_reasons_json,
       answers_json, stage_results_json, group_correct, reasons_correct, all_correct, response_ms, error_tag, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), body.sessionId, body.runId, exercise.id, exercise.version, selectedGroup,
        JSON.stringify(selectedReasons), JSON.stringify(body.answers), JSON.stringify(stageResults),
        groupCorrect ? 1 : 0, reasonsCorrect ? 1 : 0, allCorrect ? 1 : 0, responseMs, errorTag, now),
    db.prepare('UPDATE anonymous_sessions SET last_seen_at = ? WHERE id = ?').bind(now, body.sessionId),
  ];

  for (const tag of exercise.diagnosticTags) {
    statements.push(db.prepare(`INSERT INTO skill_estimates
      (session_id, tag, alpha, beta, sample_count, updated_at) VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(session_id, tag) DO UPDATE SET
        alpha=alpha+excluded.alpha-1, beta=beta+excluded.beta-1,
        sample_count=sample_count+1, updated_at=excluded.updated_at`)
      .bind(body.sessionId, tag, allCorrect ? 2 : 1, allCorrect ? 1 : 2, now));
  }
  await db.batch(statements);

  return Response.json({
    allCorrect, stageResults, correctAnswers,
    ...exercise.feedback, errorTag,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
