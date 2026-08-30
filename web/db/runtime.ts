import { CATALOG_VERSION, EXERCISE_CATALOG } from '@/domain/exercises';
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
      completed_at TEXT, catalog_version TEXT DEFAULT 'legacy' NOT NULL,
      FOREIGN KEY (session_id) REFERENCES anonymous_sessions(id))`),
    db.prepare('CREATE INDEX IF NOT EXISTS training_runs_session_started_idx ON training_runs (session_id, started_at)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY NOT NULL, session_id TEXT NOT NULL, run_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
      exercise_version INTEGER NOT NULL, selected_group TEXT NOT NULL,
      selected_reasons_json TEXT NOT NULL, answers_json TEXT DEFAULT '{}' NOT NULL,
      stage_results_json TEXT DEFAULT '{}' NOT NULL, group_correct INTEGER NOT NULL,
      reasons_correct INTEGER NOT NULL, all_correct INTEGER DEFAULT 0 NOT NULL,
      response_ms INTEGER NOT NULL, error_tag TEXT, error_tags_json TEXT DEFAULT '[]' NOT NULL,
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
    db.prepare(`CREATE TABLE IF NOT EXISTS exercise_reviews (
      exercise_id TEXT NOT NULL, exercise_version INTEGER NOT NULL,
      status TEXT DEFAULT 'unreviewed' NOT NULL, checklist_json TEXT DEFAULT '{}' NOT NULL,
      reviewer_note TEXT DEFAULT '' NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY (exercise_id, exercise_version),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sgf_imports (
      id TEXT PRIMARY KEY NOT NULL, file_name TEXT NOT NULL, object_key TEXT NOT NULL,
      sha256 TEXT NOT NULL, board_size INTEGER NOT NULL, rules TEXT NOT NULL,
      komi REAL NOT NULL, black_player TEXT DEFAULT '' NOT NULL, white_player TEXT DEFAULT '' NOT NULL,
      move_count INTEGER NOT NULL, game_json TEXT NOT NULL, created_at TEXT NOT NULL)`),
    db.prepare('CREATE INDEX IF NOT EXISTS sgf_imports_created_idx ON sgf_imports (created_at)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS position_candidates (
      id TEXT PRIMARY KEY NOT NULL, import_id TEXT NOT NULL, move_number INTEGER NOT NULL,
      to_play TEXT NOT NULL, position_json TEXT NOT NULL, status TEXT DEFAULT 'selected' NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      FOREIGN KEY (import_id) REFERENCES sgf_imports(id))`),
    db.prepare('CREATE INDEX IF NOT EXISTS position_candidates_import_move_idx ON position_candidates (import_id, move_number)'),
    db.prepare(`CREATE TABLE IF NOT EXISTS katago_analysis_jobs (
      id TEXT PRIMARY KEY NOT NULL, candidate_id TEXT NOT NULL, status TEXT DEFAULT 'pending' NOT NULL,
      visits INTEGER NOT NULL, cache_key TEXT DEFAULT '' NOT NULL, cache_hit INTEGER DEFAULT 0 NOT NULL,
      request_json TEXT NOT NULL, result_json TEXT, error_message TEXT,
      created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT,
      FOREIGN KEY (candidate_id) REFERENCES position_candidates(id))`),
    db.prepare('CREATE INDEX IF NOT EXISTS katago_jobs_candidate_created_idx ON katago_analysis_jobs (candidate_id, created_at)'),
  ]);

  const attemptColumns = (await db.prepare('PRAGMA table_info(attempts)').all<{ name: string }>()).results;
  const columnNames = new Set(attemptColumns.map((column) => column.name));
  if (!columnNames.has('answers_json')) await db.prepare("ALTER TABLE attempts ADD COLUMN answers_json TEXT DEFAULT '{}' NOT NULL").run();
  if (!columnNames.has('stage_results_json')) await db.prepare("ALTER TABLE attempts ADD COLUMN stage_results_json TEXT DEFAULT '{}' NOT NULL").run();
  if (!columnNames.has('all_correct')) await db.prepare('ALTER TABLE attempts ADD COLUMN all_correct INTEGER DEFAULT 0 NOT NULL').run();
  if (!columnNames.has('error_tags_json')) await db.prepare("ALTER TABLE attempts ADD COLUMN error_tags_json TEXT DEFAULT '[]' NOT NULL").run();

  const runColumns = (await db.prepare('PRAGMA table_info(training_runs)').all<{ name: string }>()).results;
  if (!runColumns.some((column) => column.name === 'catalog_version')) {
    await db.prepare("ALTER TABLE training_runs ADD COLUMN catalog_version TEXT DEFAULT 'legacy' NOT NULL").run();
  }

  const analysisColumns = (await db.prepare('PRAGMA table_info(katago_analysis_jobs)').all<{ name: string }>()).results;
  const analysisColumnNames = new Set(analysisColumns.map((column) => column.name));
  if (!analysisColumnNames.has('cache_key')) await db.prepare("ALTER TABLE katago_analysis_jobs ADD COLUMN cache_key TEXT DEFAULT '' NOT NULL").run();
  if (!analysisColumnNames.has('cache_hit')) await db.prepare('ALTER TABLE katago_analysis_jobs ADD COLUMN cache_hit INTEGER DEFAULT 0 NOT NULL').run();
  await db.prepare('CREATE INDEX IF NOT EXISTS katago_jobs_cache_status_idx ON katago_analysis_jobs (cache_key, status)').run();

  const now = new Date().toISOString();
  await db.batch(EXERCISE_CATALOG.map((exercise, ordinal) => db.prepare(`
    INSERT INTO exercises (id, ordinal, version, status, payload_json, created_at, updated_at)
    VALUES (?, ?, ?, 'published', ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET ordinal=excluded.ordinal, version=excluded.version,
      payload_json=excluded.payload_json, updated_at=excluded.updated_at
  `).bind(exercise.id, ordinal, exercise.version, JSON.stringify(exercise), now, now)));
  await db.prepare('PRAGMA optimize').run();
}

export { CATALOG_VERSION };

export async function getExerciseDefinition(id: string): Promise<ExerciseDefinition | null> {
  await ensureDatabase();
  const row = await getDb().prepare(
    "SELECT payload_json FROM exercises WHERE id = ? AND status = 'published'"
  ).bind(id).first<{ payload_json: string }>();
  return row ? JSON.parse(row.payload_json) as ExerciseDefinition : null;
}
