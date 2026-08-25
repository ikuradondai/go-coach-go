import { getDb } from '@/db';
import { ensureDatabase } from '@/db/runtime';
import type { ExerciseDefinition } from '@/domain/training';
import type { ExerciseQualityRecord, ReviewChecklist, ReviewStatus } from '@/domain/admin';

const STATUSES = new Set<ReviewStatus>(['unreviewed', 'in_review', 'approved', 'changes_requested']);
const CHECK_KEYS: (keyof ReviewChecklist)[] = ['positionLegal', 'answerVerified', 'explanationAligned', 'sourceCleared', 'naturalPosition'];
const emptyChecklist = (): ReviewChecklist => ({ positionLegal: false, answerVerified: false, explanationAligned: false, sourceCleared: false, naturalPosition: false });

type ExerciseRow = { id: string; version: number; payload_json: string };
type MetricRow = { exercise_id: string; exercise_version: number; attempt_count: number; accuracy: number | null; average_response_ms: number | null };
type ReviewRow = { exercise_id: string; exercise_version: number; status: ReviewStatus; checklist_json: string; reviewer_note: string; updated_at: string };

export async function GET() {
  await ensureDatabase();
  const db = getDb();
  const [exerciseResult, metricResult, reviewResult] = await Promise.all([
    db.prepare("SELECT id, version, payload_json FROM exercises WHERE status != 'archived' ORDER BY ordinal").all<ExerciseRow>(),
    db.prepare(`SELECT exercise_id, exercise_version, COUNT(*) AS attempt_count,
      AVG(all_correct) * 100 AS accuracy, AVG(response_ms) AS average_response_ms
      FROM attempts GROUP BY exercise_id, exercise_version`).all<MetricRow>(),
    db.prepare('SELECT exercise_id, exercise_version, status, checklist_json, reviewer_note, updated_at FROM exercise_reviews').all<ReviewRow>(),
  ]);

  const metricMap = new Map(metricResult.results.map((row) => [`${row.exercise_id}:${row.exercise_version}`, row]));
  const reviewMap = new Map(reviewResult.results.map((row) => [`${row.exercise_id}:${row.exercise_version}`, row]));
  const exercises: ExerciseQualityRecord[] = exerciseResult.results.map((row) => {
    const definition = JSON.parse(row.payload_json) as ExerciseDefinition;
    const key = `${row.id}:${row.version}`;
    const metric = metricMap.get(key);
    const review = reviewMap.get(key);
    const attemptCount = Number(metric?.attempt_count ?? 0);
    const accuracy = metric?.accuracy == null ? null : Math.round(Number(metric.accuracy));
    const alerts: string[] = [];
    if (attemptCount < 8) alerts.push('回答数が8件未満のため、問題統計の信頼度が不足しています');
    if (attemptCount >= 8 && accuracy !== null && (accuracy < 30 || accuracy > 95)) alerts.push('正答率が極端です。難易度または正解の明確さを確認してください');
    if (!review || review.status !== 'approved') alerts.push('公開品質レビューが未完了です');
    return {
      id: definition.id, version: definition.version, topic: definition.topic,
      stageTypes: definition.stages.map((stage) => stage.type), diagnosticTags: definition.diagnosticTags,
      profile: definition.contentProfile,
      review: {
        status: review?.status ?? 'unreviewed',
        checklist: review ? { ...emptyChecklist(), ...JSON.parse(review.checklist_json) as Partial<ReviewChecklist> } : emptyChecklist(),
        reviewerNote: review?.reviewer_note ?? '', updatedAt: review?.updated_at ?? null,
      },
      metrics: { attemptCount, accuracy, averageResponseMs: metric?.average_response_ms == null ? null : Math.round(Number(metric.average_response_ms)) },
      alerts,
    };
  });
  return Response.json({ exercises }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json().catch(() => null) as { exerciseId?: string; version?: number; status?: ReviewStatus; checklist?: Partial<ReviewChecklist>; reviewerNote?: string } | null;
  if (!body?.exerciseId || !Number.isInteger(body.version) || !body.status || !STATUSES.has(body.status) || !body.checklist || typeof body.reviewerNote !== 'string' || body.reviewerNote.length > 500) {
    return Response.json({ error: 'invalid_review' }, { status: 400 });
  }
  const checklist = emptyChecklist();
  for (const key of CHECK_KEYS) {
    if (typeof body.checklist[key] !== 'boolean') return Response.json({ error: 'invalid_checklist' }, { status: 400 });
    checklist[key] = body.checklist[key];
  }
  if (body.status === 'approved' && !CHECK_KEYS.every((key) => checklist[key])) {
    return Response.json({ error: 'quality_gates_incomplete' }, { status: 400 });
  }
  const db = getDb();
  const exists = await db.prepare('SELECT id FROM exercises WHERE id = ? AND version = ?').bind(body.exerciseId, body.version).first();
  if (!exists) return Response.json({ error: 'exercise_not_found' }, { status: 404 });
  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO exercise_reviews
    (exercise_id, exercise_version, status, checklist_json, reviewer_note, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(exercise_id, exercise_version) DO UPDATE SET
      status=excluded.status, checklist_json=excluded.checklist_json,
      reviewer_note=excluded.reviewer_note, updated_at=excluded.updated_at`)
    .bind(body.exerciseId, body.version, body.status, JSON.stringify(checklist), body.reviewerNote.trim(), now, now).run();
  return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
}
