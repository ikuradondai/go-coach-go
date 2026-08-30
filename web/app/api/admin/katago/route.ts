import { getDb, getKataGoConfig } from '@/db';
import { ensureDatabase } from '@/db/runtime';
import type { KataGoResult, ParsedSgfGame } from '@/domain/sgf';
import { sgfVertexToKataGo } from '@/lib/sgf';

type CandidateSource = { candidate_id: string; import_id: string; move_number: number; board_size: number; rules: string; komi: number; game_json: string };

export async function GET() {
  const config = getKataGoConfig();
  await ensureDatabase();
  const usage = await getMonthlyUsage(config.monthlyJobLimit);
  if (!config.url) return Response.json({ configured: false, healthy: false, usage });
  // Probing a scale-to-zero GPU would create a billable cold start whenever the
  // admin page opens. Deployment smoke tests verify the remote health endpoint;
  // normal status reads therefore report the configured service contract only.
  return Response.json({ configured: true, healthy: true, usage, detail: { provider: 'Modal', gpu: 'T4', mode: 'scale-to-zero' } });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json().catch(() => null) as { candidateId?: string; visits?: number } | null;
  const requestedVisits = Math.round(body?.visits ?? 400);
  const visits = [100, 400, 1200].includes(requestedVisits) ? requestedVisits : 400;
  if (!body?.candidateId) return Response.json({ error: 'candidate_required' }, { status: 400 });
  const config = getKataGoConfig();
  if (!config.url) return Response.json({ error: 'katago_not_configured', message: 'KATAGO_API_URLを設定してください' }, { status: 503 });
  const db = getDb();
  const source = await db.prepare(`SELECT p.id AS candidate_id, p.import_id, p.move_number,
    s.board_size, s.rules, s.komi, s.game_json FROM position_candidates p
    JOIN sgf_imports s ON s.id = p.import_id WHERE p.id = ?`).bind(body.candidateId).first<CandidateSource>();
  if (!source) return Response.json({ error: 'candidate_not_found' }, { status: 404 });
  const game = JSON.parse(source.game_json) as ParsedSgfGame;
  const queryBase = {
    initialStones: game.initialStones.map((stone) => [stone.color, sgfVertexToKataGo(stone.vertex, game.size)]),
    moves: game.moves.slice(0, source.move_number).map((move) => [move.color, sgfVertexToKataGo(move.vertex, game.size)]),
    rules: normalizeRules(game.rules), komi: game.komi,
    boardXSize: game.size, boardYSize: game.size,
    analyzeTurns: [source.move_number], includeOwnership: true, includePolicy: true,
    maxVisits: visits,
  };
  const cacheKey = await sha256(JSON.stringify(queryBase));
  const cached = await db.prepare(`SELECT result_json FROM katago_analysis_jobs
    WHERE cache_key = ? AND status = 'complete' AND result_json IS NOT NULL
    ORDER BY completed_at DESC LIMIT 1`).bind(cacheKey).first<{ result_json: string }>();
  const jobId = crypto.randomUUID();
  const query = { id: jobId, ...queryBase };
  const now = new Date().toISOString();
  if (cached) {
    const result = JSON.parse(cached.result_json) as KataGoResult;
    await db.batch([
      db.prepare(`INSERT INTO katago_analysis_jobs
        (id, candidate_id, status, visits, cache_key, cache_hit, request_json, result_json, created_at, started_at, completed_at)
        VALUES (?, ?, 'complete', ?, ?, 1, ?, ?, ?, ?, ?)`)
        .bind(jobId, source.candidate_id, visits, cacheKey, JSON.stringify(query), cached.result_json, now, now, now),
      db.prepare("UPDATE position_candidates SET status = 'analysis_complete', updated_at = ? WHERE id = ?").bind(now, source.candidate_id),
    ]);
    return Response.json({ jobId, result, cached: true });
  }
  const staleBefore = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await db.prepare(`UPDATE katago_analysis_jobs SET status = 'failed', error_message = 'analysis_timeout', completed_at = ?
    WHERE status = 'running' AND started_at < ?`).bind(now, staleBefore).run();
  const running = await db.prepare("SELECT COUNT(*) AS count FROM katago_analysis_jobs WHERE status = 'running'").first<{ count: number }>();
  if (Number(running?.count ?? 0) >= 1) return Response.json({ error: 'analysis_busy', message: '別の局面を解析中です。完了後にもう一度お試しください。' }, { status: 429 });
  const usage = await getMonthlyUsage(config.monthlyJobLimit);
  if (usage.used >= usage.limit) return Response.json({ error: 'monthly_limit_reached', message: `今月の解析上限（${usage.limit.toLocaleString()}回）に達しました。` }, { status: 429 });
  await db.batch([
    db.prepare(`INSERT INTO katago_analysis_jobs
      (id, candidate_id, status, visits, cache_key, cache_hit, request_json, created_at, started_at)
      VALUES (?, ?, 'running', ?, ?, 0, ?, ?, ?)`).bind(jobId, source.candidate_id, visits, cacheKey, JSON.stringify(query), now, now),
    db.prepare("UPDATE position_candidates SET status = 'analysis_pending', updated_at = ? WHERE id = ?").bind(now, source.candidate_id),
  ]);
  try {
    const response = await fetch(`${config.url}/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}) },
      body: JSON.stringify(query), signal: AbortSignal.timeout(120000),
    });
    if (!response.ok) throw new Error(`KataGo bridge returned ${response.status}`);
    const result = await response.json() as KataGoResult;
    if (!result.rootInfo || !Array.isArray(result.moveInfos)) throw new Error('KataGoの応答形式が不正です');
    const completedAt = new Date().toISOString();
    await db.batch([
      db.prepare("UPDATE katago_analysis_jobs SET status = 'complete', result_json = ?, completed_at = ? WHERE id = ?").bind(JSON.stringify(result), completedAt, jobId),
      db.prepare("UPDATE position_candidates SET status = 'analysis_complete', updated_at = ? WHERE id = ?").bind(completedAt, source.candidate_id),
    ]);
    return Response.json({ jobId, result });
  } catch (error) {
    const completedAt = new Date().toISOString();
    const message = error instanceof Error ? error.message.slice(0, 400) : 'KataGo解析に失敗しました';
    await db.batch([
      db.prepare("UPDATE katago_analysis_jobs SET status = 'failed', error_message = ?, completed_at = ? WHERE id = ?").bind(message, completedAt, jobId),
      db.prepare("UPDATE position_candidates SET status = 'analysis_failed', updated_at = ? WHERE id = ?").bind(completedAt, source.candidate_id),
    ]);
    return Response.json({ error: 'analysis_failed', message }, { status: 502 });
  }
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getMonthlyUsage(limit: number) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const row = await getDb().prepare(`SELECT COUNT(*) AS count FROM katago_analysis_jobs
    WHERE cache_hit = 0 AND created_at >= ?`).bind(monthStart).first<{ count: number }>();
  return { used: Number(row?.count ?? 0), limit, monthStart };
}

function normalizeRules(rules: string) {
  const value = rules.toLowerCase();
  if (value.includes('chinese')) return 'chinese';
  if (value.includes('aga')) return 'aga';
  if (value.includes('tromp')) return 'tromp-taylor';
  if (value.includes('new zealand')) return 'new-zealand';
  return 'japanese';
}
