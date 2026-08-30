import { index, integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  ordinal: integer('ordinal').notNull(),
  version: integer('version').notNull(),
  status: text('status', { enum: ['draft', 'published', 'archived'] }).notNull().default('draft'),
  payloadJson: text('payload_json').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [index('exercises_status_ordinal_idx').on(table.status, table.ordinal)]);

export const anonymousSessions = sqliteTable('anonymous_sessions', {
  id: text('id').primaryKey(),
  createdAt: text('created_at').notNull(),
  lastSeenAt: text('last_seen_at').notNull(),
});

export const trainingRuns = sqliteTable('training_runs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => anonymousSessions.id),
  startedAt: text('started_at').notNull(),
  completedAt: text('completed_at'),
  catalogVersion: text('catalog_version').notNull().default('legacy'),
}, (table) => [index('training_runs_session_started_idx').on(table.sessionId, table.startedAt)]);

export const attempts = sqliteTable('attempts', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => anonymousSessions.id),
  runId: text('run_id').notNull().references(() => trainingRuns.id),
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  exerciseVersion: integer('exercise_version').notNull(),
  selectedGroup: text('selected_group', { enum: ['a', 'b'] }).notNull(),
  selectedReasonsJson: text('selected_reasons_json').notNull(),
  answersJson: text('answers_json').notNull().default('{}'),
  stageResultsJson: text('stage_results_json').notNull().default('{}'),
  groupCorrect: integer('group_correct', { mode: 'boolean' }).notNull(),
  reasonsCorrect: integer('reasons_correct', { mode: 'boolean' }).notNull(),
  allCorrect: integer('all_correct', { mode: 'boolean' }).notNull().default(false),
  responseMs: integer('response_ms').notNull(),
  errorTag: text('error_tag'),
  errorTagsJson: text('error_tags_json').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
}, (table) => [
  index('attempts_session_created_idx').on(table.sessionId, table.createdAt),
  index('attempts_run_created_idx').on(table.runId, table.createdAt),
  index('attempts_exercise_created_idx').on(table.exerciseId, table.createdAt),
]);

export const skillEstimates = sqliteTable('skill_estimates', {
  sessionId: text('session_id').notNull().references(() => anonymousSessions.id),
  tag: text('tag').notNull(),
  alpha: real('alpha').notNull().default(1),
  beta: real('beta').notNull().default(1),
  sampleCount: integer('sample_count').notNull().default(0),
  updatedAt: text('updated_at').notNull(),
}, (table) => [primaryKey({ columns: [table.sessionId, table.tag] })]);

export const exerciseReviews = sqliteTable('exercise_reviews', {
  exerciseId: text('exercise_id').notNull().references(() => exercises.id),
  exerciseVersion: integer('exercise_version').notNull(),
  status: text('status', { enum: ['unreviewed', 'in_review', 'approved', 'changes_requested'] }).notNull().default('unreviewed'),
  checklistJson: text('checklist_json').notNull().default('{}'),
  reviewerNote: text('reviewer_note').notNull().default(''),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [primaryKey({ columns: [table.exerciseId, table.exerciseVersion] })]);

export const sgfImports = sqliteTable('sgf_imports', {
  id: text('id').primaryKey(),
  fileName: text('file_name').notNull(),
  objectKey: text('object_key').notNull(),
  sha256: text('sha256').notNull(),
  boardSize: integer('board_size').notNull(),
  rules: text('rules').notNull(),
  komi: real('komi').notNull(),
  blackPlayer: text('black_player').notNull().default(''),
  whitePlayer: text('white_player').notNull().default(''),
  moveCount: integer('move_count').notNull(),
  gameJson: text('game_json').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => [index('sgf_imports_created_idx').on(table.createdAt)]);

export const positionCandidates = sqliteTable('position_candidates', {
  id: text('id').primaryKey(),
  importId: text('import_id').notNull().references(() => sgfImports.id),
  moveNumber: integer('move_number').notNull(),
  toPlay: text('to_play', { enum: ['black', 'white'] }).notNull(),
  positionJson: text('position_json').notNull(),
  status: text('status', { enum: ['selected', 'analysis_pending', 'analysis_complete', 'analysis_failed'] }).notNull().default('selected'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => [index('position_candidates_import_move_idx').on(table.importId, table.moveNumber)]);

export const katagoAnalysisJobs = sqliteTable('katago_analysis_jobs', {
  id: text('id').primaryKey(),
  candidateId: text('candidate_id').notNull().references(() => positionCandidates.id),
  status: text('status', { enum: ['pending', 'running', 'complete', 'failed'] }).notNull().default('pending'),
  visits: integer('visits').notNull(),
  cacheKey: text('cache_key').notNull().default(''),
  cacheHit: integer('cache_hit', { mode: 'boolean' }).notNull().default(false),
  requestJson: text('request_json').notNull(),
  resultJson: text('result_json'),
  errorMessage: text('error_message'),
  createdAt: text('created_at').notNull(),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
}, (table) => [
  index('katago_jobs_candidate_created_idx').on(table.candidateId, table.createdAt),
  index('katago_jobs_cache_status_idx').on(table.cacheKey, table.status),
]);
