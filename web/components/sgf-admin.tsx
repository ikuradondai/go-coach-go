'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import AdminGoBoard from './admin-go-board';
import type { ParsedSgfGame, PositionCandidate, SgfImportSummary } from '@/domain/sgf';
import type { BoardPosition } from '@/domain/training';
import { positionAt } from '@/lib/go-position';

type Data = { imports: SgfImportSummary[]; candidates: PositionCandidate[]; katagoConfigured: boolean; game: ParsedSgfGame | null };
type EngineStatus = { configured: boolean; healthy: boolean; usage: { used: number; limit: number }; detail?: { provider?: string; gpu?: string; version?: string } | null };

const STATUS_LABEL = { selected: '局面選択済み', analysis_pending: '解析中', analysis_complete: '検証済み', analysis_failed: '解析失敗' } as const;

async function loadData(importId?: string) {
  const response = await fetch(`/api/admin/sgf${importId ? `?importId=${encodeURIComponent(importId)}` : ''}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('load_failed');
  return response.json() as Promise<Data>;
}

export default function SgfAdmin() {
  const [data, setData] = useState<Data>({ imports: [], candidates: [], katagoConfigured: false, game: null });
  const [engine, setEngine] = useState<EngineStatus>({ configured: false, healthy: false, usage: { used: 0, limit: 500 } });
  const [selectedImportId, setSelectedImportId] = useState('');
  const [moveNumber, setMoveNumber] = useState(0);
  const [visits, setVisits] = useState(400);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = async (importId = selectedImportId) => {
    const result = await loadData(importId || undefined);
    setData(result);
    if (!importId && result.imports[0]) setSelectedImportId(result.imports[0].id);
  };
  const refreshEngine = async () => {
    const response = await fetch('/api/admin/katago', { cache: 'no-store' });
    if (response.ok) setEngine(await response.json() as EngineStatus);
  };
  useEffect(() => { void refresh().catch(() => setError('SGF管理データを読み込めませんでした。')); void refreshEngine(); }, []);
  useEffect(() => {
    if (!selectedImportId) return;
    void loadData(selectedImportId).then((result) => { setData(result); setMoveNumber(result.game?.moves.length ?? 0); }).catch(() => setError('棋譜を読み込めませんでした。'));
  }, [selectedImportId]);

  const selectedImport = data.imports.find((item) => item.id === selectedImportId);
  const snapshot = useMemo(() => data.game ? positionAt(data.game, moveNumber) : null, [data.game, moveNumber]);
  const preview: BoardPosition | null = snapshot && data.game ? { size: data.game.size, toPlay: snapshot.toPlay, stones: snapshot.stones } : null;
  const lastMove = moveNumber > 0 ? data.game?.moves[moveNumber - 1] : undefined;

  const upload = async (file: File) => {
    setBusy('upload'); setMessage(null); setError(null);
    const form = new FormData(); form.set('file', file);
    try {
      const response = await fetch('/api/admin/sgf', { method: 'POST', body: form });
      const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
      if (!response.ok || !result.id) throw new Error(result.message ?? 'SGFを取り込めませんでした');
      setSelectedImportId(result.id); setMessage(`${file.name}を取り込みました。局面を選択してください。`);
      await refresh(result.id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'SGFを取り込めませんでした。'); }
    finally { setBusy(null); if (fileRef.current) fileRef.current.value = ''; }
  };

  const savePosition = async () => {
    if (!selectedImportId) return;
    setBusy('position'); setMessage(null); setError(null);
    try {
      const response = await fetch('/api/admin/sgf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ importId: selectedImportId, moveNumber }) });
      if (!response.ok) throw new Error('局面を保存できませんでした');
      setMessage(`${moveNumber}手目の局面を検証候補に追加しました。`); await refresh(selectedImportId);
    } catch (caught) { setError(caught instanceof Error ? caught.message : '局面を保存できませんでした。'); }
    finally { setBusy(null); }
  };

  const analyze = async (candidate: PositionCandidate) => {
    setBusy(candidate.id); setMessage(null); setError(null);
    try {
      const response = await fetch('/api/admin/katago', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidateId: candidate.id, visits }) });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? 'KataGo解析に失敗しました');
      setMessage(`${candidate.moveNumber}手目をKataGoで検証しました。`); await Promise.all([refresh(selectedImportId), refreshEngine()]);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'KataGo解析に失敗しました。'); await Promise.all([refresh(selectedImportId), refreshEngine()]); }
    finally { setBusy(null); }
  };

  return <section className="sgf-workspace" id="sgf-workspace">
    <div className="workspace-heading"><div><span>CONTENT PIPELINE</span><h2>SGFから検証済み局面を作る</h2><p>棋譜を取り込み、主変化の任意の手数を選び、KataGoの候補手・勝率・目差で教材化前に確認します。</p></div><div className={`engine-badge ${engine.healthy ? 'ready' : 'offline'}`}><i />KataGo {engine.healthy ? `${engine.detail?.provider ?? 'Cloud'} ${engine.detail?.gpu ?? ''}` : engine.configured ? '起動待ち' : '接続先未設定'}<small>今月 {engine.usage.used.toLocaleString()} / {engine.usage.limit.toLocaleString()} 回</small></div></div>
    {message && <p className="admin-toast success">{message}</p>}{error && <p className="admin-toast error">{error}</p>}
    <div className="pipeline-steps"><article><b>1</b><div><strong>SGF取込</strong><span>原本はR2、索引はD1へ保存</span></div></article><article><b>2</b><div><strong>局面選択</strong><span>主変化を手数スライダーで確認</span></div></article><article><b>3</b><div><strong>KataGo検証</strong><span>解析結果を局面と一緒に保存</span></div></article></div>
    <div className="sgf-tool-grid">
      <aside className="sgf-library"><div className="tool-title"><span>SGF LIBRARY</span><strong>取り込み済み棋譜</strong></div><label className="sgf-upload"><input ref={fileRef} type="file" accept=".sgf,application/x-go-sgf" disabled={busy === 'upload'} onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /><b>{busy === 'upload' ? '取込中…' : '＋ SGFファイルを取り込む'}</b><small>最大1MB・9/13/19路・主変化を使用</small></label>
        <div className="sgf-list">{!data.imports.length && <p>まだSGFがありません。</p>}{data.imports.map((item) => <button className={item.id === selectedImportId ? 'active' : ''} type="button" key={item.id} onClick={() => setSelectedImportId(item.id)}><strong>{item.fileName}</strong><span>{item.boardSize}路・{item.moveCount}手　{item.blackPlayer || '黒'} vs {item.whitePlayer || '白'}</span>{item.variationCount > 0 && <small>分岐 {item.variationCount}件（主変化を表示）</small>}</button>)}</div></aside>
      <div className="position-picker"><div className="tool-title"><span>POSITION PICKER</span><strong>{selectedImport ? selectedImport.fileName : '棋譜を選択'}</strong></div>{preview && data.game ? <><AdminGoBoard position={preview} lastMove={lastMove} /><div className="move-control"><div><span>開始</span><strong>{moveNumber}<small> / {data.game.moves.length} 手</small></strong><span>終局</span></div><input type="range" min="0" max={data.game.moves.length} value={moveNumber} onChange={(event) => setMoveNumber(Number(event.target.value))} /><p><b className={preview.toPlay} />次は{preview.toPlay === 'black' ? '黒' : '白'}番　{lastMove?.vertex ? `直前: ${lastMove.color}[${lastMove.vertex}]` : moveNumber === 0 ? '対局開始前' : '直前: パス'}</p></div><button className="primary-admin-action" type="button" disabled={busy === 'position'} onClick={() => void savePosition()}>{busy === 'position' ? '保存中…' : 'この局面を検証候補に追加'}</button></> : <div className="empty-board">左からSGFを選択してください。</div>}</div>
    </div>
    <div className="candidate-section"><div className="candidate-heading"><div><span>VALIDATION QUEUE</span><h3>検証候補</h3></div><label>探索量 <select value={visits} onChange={(event) => setVisits(Number(event.target.value))}><option value="100">100 visits（確認用）</option><option value="400">400 visits（標準）</option><option value="1200">1,200 visits（精査）</option></select></label></div>
      <div className="candidate-list">{!data.candidates.length && <p className="empty-candidates">選択した局面がここに並びます。</p>}{data.candidates.map((candidate) => { const result = candidate.analysis?.result; const best = result?.moveInfos?.[0]; return <article key={candidate.id}><div className="candidate-board"><AdminGoBoard position={candidate.position} /></div><div className="candidate-info"><span className={`candidate-status ${candidate.status}`}>{STATUS_LABEL[candidate.status]}</span><h4>{data.imports.find((item) => item.id === candidate.importId)?.fileName ?? 'SGF'}・{candidate.moveNumber}手目</h4><p>次は{candidate.toPlay === 'black' ? '黒' : '白'}番</p>{result && <div className="analysis-summary"><div><span>最善手</span><strong>{best?.move ?? '—'}</strong></div><div><span>勝率</span><strong>{best ? `${(best.winrate * 100).toFixed(1)}%` : '—'}</strong></div><div><span>目差</span><strong>{best ? `${best.scoreLead > 0 ? '+' : ''}${best.scoreLead.toFixed(1)}` : '—'}</strong></div><div><span>探索数</span><strong>{result.rootInfo.visits.toLocaleString()}</strong></div></div>}{candidate.analysis?.error && <p className="analysis-error">{candidate.analysis.error}</p>}<button type="button" disabled={!engine.configured || busy === candidate.id} onClick={() => void analyze(candidate)}>{busy === candidate.id ? '解析中…' : result ? '再解析する' : 'KataGoで検証'}</button></div></article>; })}</div>
    </div>
  </section>;
}
