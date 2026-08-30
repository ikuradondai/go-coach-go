import { getDb, getKataGoConfig } from '@/db';
import { ensureDatabase } from '@/db/runtime';
import type { KataGoResult, ParsedSgfGame } from '@/domain/sgf';
import { sgfVertexToKataGo } from '@/lib/sgf';

type CandidateSource = { candidate_id: string; import_id: string; move_number: number; board_size: number; rules: string; komi: number; game_json: string };

export async function GET() {
  const config = getKataGoConfig();
  if (!config.url) return Response.json({ configured: false, healthy: false });
  try {
    const response = await fetch(`${config.url}/health`, { headers: config.token ? { Authorization: `Bearer ${config.token}` } : {}, signal: AbortSignal.timeout(5000) });
    return Response.json({ configured: true, healthy: response.ok, detail: response.ok ? await response.json().catch(() => null) : null });
  } catch { return Response.json({ configured: true, healthy: false }); }
}

export async function POST(request: Request) {
  await ensureDatabase();
  const body = await request.json().catch(() => null) as { candidateId?: string; visits?: number } | null;
  const visits = Math.max(50, Math.min(5000, Math.round(body?.visits ?? 400)));
  if (!body?.candidateId) return Response.json({ error: 'candidate_required' }, { status: 400 });
  const config = getKataGoConfig();
  if (!config.url) return Response.json({ error: 'katago_not_configured', message: 'KATAGO_API_URLを設定してください' }, { status: 503 });
  const db = getDb();
  const source = await db.prepare(`SELECT p.id AS candidate_id, p.import_id, p.move_number,
    s.board_size, s.rules, s.komi, s.game_json FROM position_candidates p
    JOIN sgf_imports s ON s.id = p.import_id WHERE p.id = ?`).bind(body.candidateId).first<CandidateSource>();
  if (!source) return Response.json({ error: 'candidate_not_found' }, { status: 404 });
  const game = JSON.parse(source.game_json) as ParsedSgfGame;
  const jobId = crypto.randomUUID();
  const query = {
    id: jobId,
    initialStones: game.initialStones.map((stone) => [stone.color, sgfVertexToKataGo(stone.vertex, game.size)]),
    moves: game.moves.slice(0, source.move_number).map((move) => [move.color, sgfVertexToKataGo(move.vertex, game.size)]),
    rules: normalizeRules(game.rules), komi: game.komi,
    boardXSize: game.size, boardYSize: game.size,
    analyzeTurns: [source.move_number], includeOwnership: true, includePolicy: true,
    maxVisits: visits,
  };
  const now = new Date().toISOString();
  await db.batch([
    db.prepare(`INSERT INTO katago_analysis_jobs
      (id, candidate_id, status, visits, request_json, created_at, started_at)
      VALUES (?, ?, 'running', ?, ?, ?, ?)`).bind(jobId, source.candidate_id, visits, JSON.stringify(query), now, now),
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

function normalizeRules(rules: string) {
  const value = rules.toLowerCase();
  if (value.includes('chinese')) return 'chinese';
  if (value.includes('aga')) return 'aga';
  if (value.includes('tromp')) return 'tromp-taylor';
  if (value.includes('new zealand')) return 'new-zealand';
  return 'japanese';
}
