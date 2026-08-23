import { ensureDatabase } from '@/db/runtime';
import { getDb } from '@/db';
import { toExerciseView } from '@/domain/exercises';
import type { ExerciseDefinition } from '@/domain/training';

export async function GET() {
  await ensureDatabase();
  const result = await getDb().prepare(
    "SELECT payload_json FROM exercises WHERE status = 'published' ORDER BY ordinal"
  ).all<{ payload_json: string }>();
  const exercises = result.results.map((row) => toExerciseView(JSON.parse(row.payload_json) as ExerciseDefinition));
  return Response.json({ exercises }, { headers: { 'Cache-Control': 'no-store' } });
}
