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
