import { getDb, getFiles, getKataGoConfig } from '@/db';
import { ensureDatabase } from '@/db/runtime';
import type { KataGoResult, ParsedSgfGame, PositionCandidate, SgfImportSummary } from '@/domain/sgf';
import type { BoardPosition } from '@/domain/training';
import { parseSgf } from '@/lib/sgf';
import { positionAt } from '@/lib/go-position';

type ImportRow = { id: string; file_name: string; board_size: number; rules: string; komi: number; black_player: string; white_player: string; move_count: number; game_json: string; created_at: string };
type CandidateRow = { id: string; import_id: string; move_number: number; to_play: 'black' | 'white'; position_json: string; status: PositionCandidate['status']; created_at: string };
type JobRow = { id: string; candidate_id: string; status: 'pending' | 'running' | 'complete' | 'failed'; visits: number; result_json: string | null; error_message: string | null; created_at: string };

export async function GET(request: Request) {
  await ensureDatabase();
  const db = getDb();
  const [importRows, candidateRows, jobRows] = await Promise.all([
    db.prepare('SELECT id, file_name, board_size, rules, komi, black_player, white_player, move_count, game_json, created_at FROM sgf_imports ORDER BY created_at DESC LIMIT 50').all<ImportRow>(),
    db.prepare('SELECT id, import_id, move_number, to_play, position_json, status, created_at FROM position_candidates ORDER BY created_at DESC LIMIT 100').all<CandidateRow>(),
    db.prepare(`SELECT id, candidate_id, status, visits, result_json, error_message, created_at
      FROM katago_analysis_jobs ORDER BY created_at DESC LIMIT 200`).all<JobRow>(),
  ]);
  const latestJobs = new Map<string, JobRow>();
  for (const row of jobRows.results) if (!latestJobs.has(row.candidate_id)) latestJobs.set(row.candidate_id, row);
  const imports: SgfImportSummary[] = importRows.results.map((row) => ({
    id: row.id, fileName: row.file_name, boardSize: row.board_size, rules: row.rules, komi: row.komi,
    blackPlayer: row.black_player, whitePlayer: row.white_player, moveCount: row.move_count,
    variationCount: (JSON.parse(row.game_json) as ParsedSgfGame).variationCount, createdAt: row.created_at,
  }));
  const candidates: PositionCandidate[] = candidateRows.results.map((row) => {
    const job = latestJobs.get(row.id);
    return {
      id: row.id, importId: row.import_id, moveNumber: row.move_number, toPlay: row.to_play,
      position: JSON.parse(row.position_json) as BoardPosition, status: row.status, createdAt: row.created_at,
      analysis: job ? { id: job.id, status: job.status, visits: job.visits, result: job.result_json ? JSON.parse(job.result_json) as KataGoResult : null, error: job.error_message, createdAt: job.created_at } : null,
    };
  });
  const requestedImport = new URL(request.url).searchParams.get('importId');
  const gameRow = requestedImport ? importRows.results.find((row) => row.id === requestedImport)
    ?? await db.prepare('SELECT id, game_json FROM sgf_imports WHERE id = ?').bind(requestedImport).first<Pick<ImportRow, 'id' | 'game_json'>>() : null;
  return Response.json({ imports, candidates, katagoConfigured: Boolean(getKataGoConfig().url), game: gameRow ? JSON.parse(gameRow.game_json) as ParsedSgfGame : null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  await ensureDatabase();
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) return importSgf(request);
  const body = await request.json().catch(() => null) as { importId?: string; moveNumber?: number } | null;
  if (!body?.importId || !Number.isInteger(body.moveNumber) || body.moveNumber! < 0) return Response.json({ error: 'invalid_position' }, { status: 400 });
  const db = getDb();
  const imported = await db.prepare('SELECT board_size, move_count, game_json FROM sgf_imports WHERE id = ?').bind(body.importId).first<{ board_size: number; move_count: number; game_json: string }>();
  if (!imported) return Response.json({ error: 'sgf_not_found' }, { status: 404 });
  if (body.moveNumber! > imported.move_count) return Response.json({ error: 'move_out_of_range' }, { status: 400 });
  const game = JSON.parse(imported.game_json) as ParsedSgfGame;
  const snapshot = positionAt(game, body.moveNumber!);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const position: BoardPosition = { size: game.size, toPlay: snapshot.toPlay, stones: snapshot.stones, source: { kind: 'sgf', moveNumber: body.moveNumber } };
  await db.prepare(`INSERT INTO position_candidates
    (id, import_id, move_number, to_play, position_json, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'selected', ?, ?)`)
    .bind(id, body.importId, body.moveNumber, snapshot.toPlay, JSON.stringify(position), now, now).run();
  return Response.json({ id }, { status: 201 });
}

async function importSgf(request: Request) {
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'file_required' }, { status: 400 });
  if (!file.name.toLowerCase().endsWith('.sgf')) return Response.json({ error: 'sgf_only' }, { status: 400 });
  if (file.size === 0 || file.size > 1024 * 1024) return Response.json({ error: 'file_size' }, { status: 400 });
  const bytes = await file.arrayBuffer();
  const contents = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  let game: ParsedSgfGame;
  try { game = parseSgf(contents); }
  catch (error) { return Response.json({ error: 'invalid_sgf', message: error instanceof Error ? error.message : 'SGFを解析できません' }, { status: 422 }); }
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
  const id = crypto.randomUUID();
  const objectKey = `sgf/${new Date().toISOString().slice(0, 10)}/${id}.sgf`;
  const files = getFiles();
  await files.put(objectKey, bytes, { httpMetadata: { contentType: 'application/x-go-sgf' }, customMetadata: { originalName: file.name, sha256 } });
  const now = new Date().toISOString();
  try {
    await getDb().prepare(`INSERT INTO sgf_imports
      (id, file_name, object_key, sha256, board_size, rules, komi, black_player, white_player, move_count, game_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, file.name.slice(0, 180), objectKey, sha256, game.size, game.rules, game.komi, game.blackPlayer.slice(0, 120), game.whitePlayer.slice(0, 120), game.moves.length, JSON.stringify(game), now).run();
  } catch (error) {
    await files.delete(objectKey);
    throw error;
  }
  return Response.json({ id }, { status: 201 });
}
