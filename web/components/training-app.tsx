'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnswerValue, AttemptFeedback, ExerciseAnswers, ExerciseView, PublicStage, TrainingReport } from '@/domain/training';

type Identity = { sessionId: string; runId: string };
type Phase = 'answering' | 'feedback' | 'report';

const STAGE_LABELS: Record<PublicStage['type'], string> = {
  compare_groups: '一団を比較', select_group: '弱い石を発見', select_evidence: '根拠を確認',
  urgent_or_large: '急場と大場', choose_plan: '方針を選択', choose_move: '着手を選択',
};

function GoBoard({ exercise, stage, answer, feedback, phase, onAnswer }: {
  exercise: ExerciseView; stage: PublicStage; answer?: AnswerValue; feedback: AttemptFeedback | null;
  phase: Phase; onAnswer: (answer: string) => void;
}) {
  const position = exercise.position;
  const crop = position.crop ?? { x: 0, y: 0, width: position.size, height: position.size };
  const verticals = useMemo(() => Array.from({ length: crop.width }), [crop.width]);
  const horizontals = useMemo(() => Array.from({ length: crop.height }), [crop.height]);
  const left = (x: number) => `${(x - crop.x) / Math.max(1, crop.width - 1) * 100}%`;
  const top = (y: number) => `${(y - crop.y) / Math.max(1, crop.height - 1) * 100}%`;
  const visible = (x: number, y: number) => x >= crop.x && x < crop.x + crop.width && y >= crop.y && y < crop.y + crop.height;
  const groupStage = stage.type === 'compare_groups' || stage.type === 'select_group' ? stage : null;
  const moveStage = stage.type === 'choose_move' ? stage : null;
  const correctGroup = phase === 'feedback'
    ? Object.entries(feedback?.correctAnswers ?? {}).find(([id]) => exercise.stages.some((item) => item.id === id && (item.type === 'compare_groups' || item.type === 'select_group')))?.[1]
    : null;

  return <div className="board-shell"><div className="board" style={{ aspectRatio: `${crop.width}/${crop.height}` }} aria-label={`${position.size}路の囲碁盤。${position.toPlay === 'black' ? '黒' : '白'}番です`}>
    <div className="grid-lines" aria-hidden="true">
      {verticals.map((_, i) => <span key={`v-${i}`} className="line vertical" style={{ left: `${i / Math.max(1, crop.width - 1) * 100}%` }} />)}
      {horizontals.map((_, i) => <span key={`h-${i}`} className="line horizontal" style={{ top: `${i / Math.max(1, crop.height - 1) * 100}%` }} />)}
      {[3, 9, 15].flatMap((x) => [3, 9, 15].map((y) => visible(x, y) && <span key={`${x}-${y}`} className="hoshi" style={{ left: left(x), top: top(y) }} />))}
    </div>
    {position.stones.filter((stone) => visible(stone.x, stone.y)).map((stone, i) => {
      const selectable = phase === 'answering' && Boolean(groupStage?.candidates.some((item) => item.id === stone.group));
      return <button key={`${stone.x}-${stone.y}-${i}`} type="button" aria-label={`${stone.color === 'black' ? '黒' : '白'}石${stone.group ? ` グループ${stone.group}` : ''}`} className={`stone ${stone.color} ${selectable ? 'selectable' : ''} ${answer === stone.group ? 'selected' : ''} ${correctGroup === stone.group ? 'correct' : ''}`} style={{ left: left(stone.x), top: top(stone.y), width: `${92 / Math.max(crop.width, crop.height)}%` }} onClick={() => selectable && stone.group && onAnswer(stone.group)} disabled={!selectable} />;
    })}
    {phase === 'answering' && groupStage?.candidates.map((candidate) => <button key={candidate.id} className={`group-target ${answer === candidate.id ? 'active' : ''}`} type="button" style={{ left: `${candidate.target.left}%`, top: `${candidate.target.top}%` }} onClick={() => onAnswer(candidate.id)} aria-label={`${candidate.marker} ${candidate.label}`}><span>{candidate.marker}</span></button>)}
    {phase === 'answering' && moveStage?.candidates.filter((move) => visible(move.x, move.y)).map((move) => <button key={move.id} className={`move-target ${answer === move.id ? 'active' : ''}`} type="button" style={{ left: left(move.x), top: top(move.y) }} onClick={() => onAnswer(move.id)} aria-label={move.label}>{move.label}</button>)}
    {phase === 'feedback' && feedback?.boardNotes.map((note, i) => <span key={i} className="annotation" style={{ left: `${note.left}%`, top: `${note.top}%` }}>{note.label}</span>)}
  </div></div>;
}

function ChoiceStage({ stage, answer, onChange }: { stage: PublicStage; answer?: AnswerValue; onChange: (answer: AnswerValue) => void }) {
  if (stage.type === 'compare_groups' || stage.type === 'select_group' || stage.type === 'choose_move') return null;
  const options = stage.options;
  const multiple = stage.type === 'select_evidence';
  const selected = Array.isArray(answer) ? answer : answer ? [answer] : [];
  return <div className="reason-list">{options.map((option, index) => <button key={option.id} type="button" className={selected.includes(option.id) ? 'active' : ''} onClick={() => {
    if (!multiple) { onChange(option.id); return; }
    onChange(selected.includes(option.id) ? selected.filter((id) => id !== option.id) : [...selected, option.id]);
  }}><span>{String.fromCharCode(65 + index)}</span><span className="choice-copy"><b>{option.label}</b>{option.detail && <small>{option.detail}</small>}</span><i aria-hidden="true">✓</i></button>)}</div>;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

export default function TrainingApp() {
  const [exercises, setExercises] = useState<ExerciseView[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [answers, setAnswers] = useState<ExerciseAnswers>({});
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [report, setReport] = useState<TrainingReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const exercise = exercises[questionIndex];
  const stage = exercise?.stages[stageIndex];

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stored = window.localStorage.getItem('gogan-identity');
        const previous = stored ? JSON.parse(stored) as Partial<Identity> : {};
        const [session, catalog] = await Promise.all([
          fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(previous) }).then(json<Identity>),
          fetch('/api/training', { cache: 'no-store' }).then(json<{ exercises: ExerciseView[] }>),
        ]);
        const progress = await fetch(`/api/report?runId=${encodeURIComponent(session.runId)}`, { cache: 'no-store' }).then(json<TrainingReport>);
        if (!active) return;
        setIdentity(session); setExercises(catalog.exercises); startedAt.current = Date.now();
        if (progress.attemptCount >= catalog.exercises.length) { setReport(progress); setPhase('report'); }
        else setQuestionIndex(progress.attemptCount);
        window.localStorage.setItem('gogan-identity', JSON.stringify(session));
      } catch { if (active) setError('診断データを読み込めませんでした。通信状態を確認してください。'); }
    })();
    return () => { active = false; };
  }, []);

  const currentAnswer = stage ? answers[stage.id] : undefined;
  const canContinue = Boolean(currentAnswer && (!Array.isArray(currentAnswer) || currentAnswer.length >= (stage?.type === 'select_evidence' ? stage.minSelections ?? 1 : 1)));
  const updateAnswer = (value: AnswerValue) => stage && setAnswers((current) => ({ ...current, [stage.id]: value }));

  const submitExercise = async () => {
    if (!identity || !exercise) return;
    setBusy(true); setError(null);
    try {
      const result = await fetch('/api/attempts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, exerciseId: exercise.id, answers, responseMs: Date.now() - startedAt.current }) }).then(json<AttemptFeedback>);
      setFeedback(result); setPhase('feedback');
    } catch { setError('回答を保存できませんでした。もう一度お試しください。'); }
    finally { setBusy(false); }
  };

  const continueStage = () => {
    if (!exercise || !stage || !canContinue) return;
    if (stageIndex < exercise.stages.length - 1) setStageIndex((index) => index + 1);
    else void submitExercise();
  };

  const resetExercise = () => { setStageIndex(0); setPhase('answering'); setAnswers({}); setFeedback(null); setError(null); startedAt.current = Date.now(); };
  const loadReport = async () => {
    if (!identity) return;
    setBusy(true);
    try { const result = await fetch(`/api/report?runId=${encodeURIComponent(identity.runId)}`, { cache: 'no-store' }).then(json<TrainingReport>); setReport(result); setPhase('report'); }
    catch { setError('診断結果を読み込めませんでした。'); }
    finally { setBusy(false); }
  };
  const advance = () => { if (questionIndex === exercises.length - 1) void loadReport(); else { setQuestionIndex((index) => index + 1); resetExercise(); } };
  const restart = async () => {
    if (!identity) return;
    setBusy(true);
    try {
      const next = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: identity.sessionId }) }).then(json<Identity>);
      setIdentity(next); window.localStorage.setItem('gogan-identity', JSON.stringify(next)); setQuestionIndex(0); setReport(null); resetExercise();
    } catch { setError('新しい診断を開始できませんでした。'); }
    finally { setBusy(false); }
  };

  if (error && !exercise) return <main className="app-frame"><section className="report"><div className="report-intro"><p className="question-number">CONNECTION ERROR</p><h1>診断を開始できませんでした。</h1><p>{error}</p><button className="primary-button" type="button" onClick={() => window.location.reload()}>再読み込み</button></div></section></main>;
  if (!exercise || !stage || !identity) return <main className="app-frame"><section className="report"><div className="report-intro"><p className="question-number">PREPARING</p><h1>診断を準備しています。</h1><p>問題と学習履歴を読み込んでいます。</p></div></section></main>;

  const playerName = exercise.position.toPlay === 'black' ? '黒' : '白';
  const accuracy = report?.accuracy ?? 0;
  const promptLines = stage.prompt.split('\n');
  return <main className="app-frame">
    <header className="topbar"><a className="brand" href="#top" aria-label="碁眼 ホーム"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>碁眼 <small>GO-GAN</small></span></a><div className="lesson-progress" aria-label={`診断の進捗 ${phase === 'report' ? exercises.length : questionIndex + 1}問目`}><span>判断トレーニング</span><div className="progress-track"><i style={{ width: phase === 'report' ? '100%' : `${(questionIndex + 1) / exercises.length * 100}%` }} /></div><strong>{phase === 'report' ? exercises.length : questionIndex + 1} <small>/ {exercises.length}</small></strong></div><span className="quiet-note">複数の判断形式で診断</span></header>
    {phase !== 'report' ? <section className="lesson" id="top">
      <div className="board-column"><div className="eyebrow"><span>判断軸 {String(questionIndex + 1).padStart(2, '0')}</span> {exercise.topic}</div><GoBoard exercise={exercise} stage={stage} answer={currentAnswer} feedback={feedback} phase={phase} onAnswer={updateAnswer} /><p className="board-caption"><b className="turn-stone" />あなたは{playerName}番です　{exercise.position.size}路盤・{STAGE_LABELS[stage.type]}</p></div>
      <aside className="question-card" aria-live="polite">
        {phase === 'answering' && <><p className="perspective-label"><i />YOU ARE {exercise.position.toPlay.toUpperCase()}</p><div className="stage-meta"><span>{STAGE_LABELS[stage.type]}</span><b>{stageIndex + 1} / {exercise.stages.length}</b></div><p className="question-number">QUESTION {String(questionIndex + 1).padStart(2, '0')}</p><h1>{promptLines.map((line, index) => <span key={`${line}-${index}`}>{line}{index < promptLines.length - 1 && <br />}</span>)}</h1><p className="lead">{stage.lead}</p><ChoiceStage stage={stage} answer={currentAnswer} onChange={updateAnswer} />{(stage.type === 'compare_groups' || stage.type === 'select_group') && <p className="tap-guide">盤上の候補をタップして選択</p>}{stage.type === 'choose_move' && <p className="tap-guide">盤上の着手候補をタップ</p>}{error && <p className="personal-note">{error}</p>}<div className="stage-actions">{stageIndex > 0 && <button className="back-link" type="button" onClick={() => setStageIndex((index) => index - 1)}>← 前の判断へ</button>}<button className="primary-button" type="button" disabled={!canContinue || busy} onClick={continueStage}>{busy ? '採点しています…' : stageIndex === exercise.stages.length - 1 ? '判断を確かめる' : '次の判断へ'}</button></div></>}
        {phase === 'feedback' && feedback && <><p className="result-label">{feedback.allCorrect ? '一連の判断が一致しました' : 'ここが今回の発見です'}</p><h1>{feedback.conclusion}</h1><p className="principle">{feedback.principle}</p><div className="stage-result-list">{exercise.stages.map((item, index) => <div key={item.id} className={feedback.stageResults[item.id] ? 'correct' : 'miss'}><span>{feedback.stageResults[item.id] ? '✓' : '!'}</span><p><strong>{STAGE_LABELS[item.type]}</strong>{feedback.stageResults[item.id] ? '判断できました' : 'もう一度確認しましょう'}</p></div>)}</div><div className="explanation-steps">{feedback.explanations.map((item, index) => <div key={item.title} className={index === 2 ? 'muted' : ''}><span>{index + 1}</span><p><strong>{item.title}</strong>{item.body}</p></div>)}</div>{feedback.errorTag && <p className="personal-note">「{feedback.errorTag}」傾向の可能性を記録しました。</p>}<button className="primary-button" type="button" disabled={busy} onClick={advance}>{busy ? '集計しています…' : questionIndex === exercises.length - 1 ? '診断結果を見る' : '次の問題へ'}</button></>}
      </aside>
    </section> : <section className="report" id="top"><div className="report-intro"><p className="question-number">COACH REPORT</p><h1>答えだけでなく、<br />判断の過程を見ました。</h1><p>一団の発見、比較、根拠、優先順位を別々に記録した暫定診断です。</p></div><div className="score-card"><span>一連の判断の一致度</span><strong>{accuracy}<small>%</small></strong><div className="score-ring" style={{ '--score': `${accuracy * 3.6}deg` } as React.CSSProperties}><i /></div><p>{accuracy >= 80 ? '複数の判断形式でも基準が安定しています。' : '眼・逃げ道・優先順位の順に確認しましょう。'}</p></div><div className="report-grid"><article className="report-card strength"><span>現在の強み</span><h2>{(report?.groupAccuracy ?? 0) >= 67 ? '弱い石を発見する視点' : '盤面全体を見る直感'}</h2><p>操作形式が変わっても同じ判断基準を使えるかを見ています。</p></article><article className="report-card focus"><span>次に鍛える視点</span><h2>{report?.firstErrorTag ?? '優先順位の具体化'}</h2><p>認識から理由、方針へつなげる練習を続けます。</p></article><article className="report-card method"><span>あなたのものさし</span><ol><li>弱い一団を見つける</li><li>眼と逃げ道を確認</li><li>急場を大場より優先</li></ol></article></div><div className="report-actions"><button className="primary-button" type="button" disabled={busy} onClick={restart}>{busy ? '準備しています…' : 'もう一度診断する'}</button><p>回答履歴は匿名で保存されます。</p></div></section>}
    <footer className="lesson-footer"><span>判断の流れ</span><p>① 発見する　→　② 比較する　→　③ 根拠を確認　→　④ 方針を決める</p></footer>
  </main>;
}
