import { EXERCISE_CATALOG } from '@/domain/exercises';
import type { ExerciseDefinition } from '@/domain/training';
import { getDb } from './index';

let initialization: Promise<void> | null = null;

export function ensureDatabase(): Promise<void> {
  initialization ??= initialize();
  return initialization;
}

async function initialize() {
  const db = getDb();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY NOT NULL, ordinal INTEGER NOT NULL, version INTEGER NOT NULL,
      status TEXT DEFAULT 'draft' NOT NULL, payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    db.prepare('CREATE INDEX IF NOT EXISTS exercises_status_ordinal_idx ON exercises (status, ordinal)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS anonymous_sessions (
      id TEXT PRIMARY KEY NOT NULL, created_at TEXT NOT NULL, last_seen_at TEXT NOT NULL)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS training_runs (
      id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, started_at TEXT NOT NULL,
      completed_at TEXT, FOREIGN KEY (session_id) REFERENCES anonymous_sessions(id))`),
    db.prepare('CREATE INDEX IF NOT EXISTS training_runs_session_started_idx ON training_runs (session_id, started_at)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, run_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
      exercise_version INTEGER NOT NULL, selected_group TEXT NOT NULL,
      selected_reasons_json TEXT NOT NULL, answers_json TEXT DEFAULT '{}' NOT NULL,
      stage_results_json TEXT DEFAULT '{}' NOT NULL, group_correct INTEGER NOT NULL,
      reasons_correct INTEGER NOT NULL, all_correct INTEGER DEFAULT 0 NOT NULL,
      response_ms INTEGER NOT NULL, error_tag TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES anonymous_sessions(id),
      FOREIGN KEY (run_id) REFERENCES training_runs(id),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id))`),
    db.prepare('CREATE INDEX IF NOT EXISTS attempts_session_created_idx ON attempts (session_id, created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS attempts_run_created_idx ON attempts (run_id, created_at)'),
    db.prepare('CREATE INDEX IF NOT EXISTS attempts_exercise_created_idx ON attempts (exercise_id, created_at)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS skill_estimates (
      session_id TEXT NOT NULL, tag TEXT NOT NULL, alpha REAL DEFAULT 1 NOT NULL,
      beta REAL DEFAULT 1 NOT NULL, sample_count INTEGER DEFAULT 0 NOT NULL,
      updated_at TEXT NOT NULL, PRIMARY KEY (session_id, tag),
      FOREIGN KEY (session_id) REFERENCES anonymous_sessions(id))`),
  ]);

  const attemptColumns = (await db.prepare('PRAGMA table_info(attempts)').all<{ name: string }>()).results;
  const columnNames = new Set(attemptColumns.map((column) => column.name));
  if (!columnNames.has('answers_json')) await db.prepare("ALTER TABLE attempts ADD COLUMN answers_json TEXT DEFAULT '{}' NOT NULL").run();
  if (!columnNames.has('stage_results_json')) await db.prepare("ALTER TABLE attempts ADD COLUMN stage_results_json TEXT DEFAULT '{}' NOT NULL").run();
  if (!columnNames.has('all_correct')) await db.prepare('ALTER TABLE attempts ADD COLUMN all_correct INTEGER DEFAULT 0 NOT NULL').run();

  const now = new Date().toISOString();
  await db.batch(EXERCISE_CATALOG.map((exercise, ordinal) => db.prepare(`
    INSERT INTO exercises (id, ordinal, version, status, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, 'published', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET ordinal=excluded.ordinal, version=excluded.version,
      payload_json=excluded.payload_json, updated_at=excluded.updated_at
  `).bind(exercise.id, ordinal, exercise.version, JSON.stringify(exercise), now, now)));
  await db.prepare('PRAGMA optimize').run();
}

export async function getExerciseDefinition(id: string): Promise<ExerciseDefinition | null> {
  await ensureDatabase();
  const row = await getDb().prepare(
    "SELECT payload_json FROM exercises WHERE id = ? AND status = 'published'"
  ).bind(id).first<{ payload_json: string }>();
  return row ? JSON.parse(row.payload_json) as ExerciseDefinition : null;
}
