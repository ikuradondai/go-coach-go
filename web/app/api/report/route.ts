import { getDb } from '@/db';
import { ensureDatabase } from '@/db/runtime';
import { EXERCISE_CATALOG } from '@/domain/exercises';
import type { DiagnosticTag } from '@/domain/training';

type AttemptRow = { exercise_id: string; stage_results_json: string };

const TAG_LABELS: Record<DiagnosticTag, string> = {
  weak_group_detection: '盤面から弱い一団を発見する',
  own_group_overestimate: '自分の石を強く見積もりすぎる',
  opponent_weakness_miss: '相手の弱石を見落とす',
  stone_count_bias: '石数を強さと混同する',
  connected_means_safe: 'つながりを安全とみなす',
  eye_space_miss: '眼を作る余地を見落とす',
  escape_route_miss: '逃げ道・連絡先を見落とす',
  local_context_bias: '周囲の厚みを含めず判断する',
  transfer_failure: '判断基準を別局面へ転用する',
};

const STAGE_IDS = ['discover', 'compare', 'evidence', 'transfer'] as const;

export async function GET(request: Request) {
  const runId = new URL(request.url).searchParams.get('runId');
  if (!runId) return Response.json({ error: 'run_required' }, { status: 400 });
  await ensureDatabase();
  const rows = (await getDb().prepare(`
    SELECT exercise_id, stage_results_json FROM attempts WHERE run_id = ? ORDER BY created_at
  `).bind(runId).all<AttemptRow>()).results;

  const byId = new Map(EXERCISE_CATALOG.map((exercise) => [exercise.id, exercise]));
  const stageTotals = Object.fromEntries(STAGE_IDS.map((id) => [id, { correct: 0, total: 0 }])) as Record<typeof STAGE_IDS[number], { correct: number; total: number }>;
  const tags = new Map<DiagnosticTag, { misses: number; samples: number }>();
  let correctDecisions = 0;
  let totalDecisions = 0;

  for (const row of rows) {
    const exercise = byId.get(row.exercise_id);
    if (!exercise) continue;
    const results = JSON.parse(row.stage_results_json) as Record<string, boolean>;
    for (const stage of exercise.stages) {
      const correct = Boolean(results[stage.id]);
      if (stage.id in stageTotals) {
        const total = stageTotals[stage.id as keyof typeof stageTotals];
        total.total += 1;
        if (correct) total.correct += 1;
      }
      totalDecisions += 1;
      if (correct) correctDecisions += 1;
      const score = tags.get(stage.diagnosticTag) ?? { misses: 0, samples: 0 };
      score.samples += 1;
      if (!correct) score.misses += 1;
      tags.set(stage.diagnosticTag, score);
    }
  }

  const attemptCount = rows.length;
  const stageAccuracy = Object.fromEntries(STAGE_IDS.map((id) => {
    const score = stageTotals[id];
    return [id, score.total ? Math.round(score.correct / score.total * 100) : 0];
  }));
  const tendencies = [...tags.entries()]
    .filter(([, score]) => score.misses > 0)
    .sort((a, b) => b[1].misses - a[1].misses || b[1].samples - a[1].samples)
    .slice(0, 3)
    .map(([tag, score]) => ({ tag, label: TAG_LABELS[tag], ...score, status: attemptCount >= 8 && score.samples >= 3 && score.misses >= 2 ? 'observed' : 'possible' }));

  return Response.json({
    attemptCount,
    completed: attemptCount >= EXERCISE_CATALOG.length,
    accuracy: totalDecisions ? Math.round(correctDecisions / totalDecisions * 100) : 0,
    stageAccuracy,
    tendencies,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
