'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { REASONS, type AttemptFeedback, type ExerciseView, type GroupId, type Step, type TrainingReport } from '@/domain/training';

type Identity = { sessionId: string; runId: string };

function GoBoard({ exercise, feedback, selectedGroup, step, onSelect }: {
  exercise: ExerciseView; feedback: AttemptFeedback | null; selectedGroup: GroupId | null;
  step: Step; onSelect: (group: GroupId) => void;
}) {
  const lines = useMemo(() => Array.from({ length: 19 }), []);
  return <div className="board-shell"><div className="board" aria-label={`19路の囲碁盤。${exercise.player === 'black' ? '黒' : '白'}のAとBを比較します`}>
    <div className="grid-lines" aria-hidden="true">
      {lines.map((_, i) => <span key={`v-${i}`} className="line vertical" style={{ left: `${i / 18 * 100}%` }} />)}
      {lines.map((_, i) => <span key={`h-${i}`} className="line horizontal" style={{ top: `${i / 18 * 100}%` }} />)}
      {[3, 9, 15].flatMap((x) => [3, 9, 15].map((y) => <span key={`${x}-${y}`} className="hoshi" style={{ left: `${x / 18 * 100}%`, top: `${y / 18 * 100}%` }} />))}
    </div>
    {exercise.stones.map((stone, i) => {
      const selectable = Boolean(stone.group) && step === 'group';
      return <button key={`${stone.x}-${stone.y}-${i}`} type="button" aria-label={`${stone.color === 'black' ? '黒' : '白'}石 ${stone.group ? `選択肢${stone.group.toUpperCase()}` : ''}`} className={`stone ${stone.color} ${selectable ? 'selectable' : ''} ${stone.group && selectedGroup === stone.group ? 'selected' : ''} ${step === 'feedback' && stone.group === feedback?.correctGroup ? 'correct' : ''}`} style={{ left: `${stone.x / 18 * 100}%`, top: `${stone.y / 18 * 100}%` }} onClick={() => stone.group && selectable && onSelect(stone.group)} disabled={!selectable} />;
    })}
    {step === 'group' && (['a', 'b'] as GroupId[]).map((group) => <button key={group} className="group-target" type="button" style={{ left: `${exercise.targets[group].left}%`, top: `${exercise.targets[group].top}%` }} onClick={() => onSelect(group)} aria-label={`${group.toUpperCase()} ${exercise.groupLabels[group]}`}><span>{group.toUpperCase()}</span></button>)}
    {step === 'feedback' && feedback?.boardNotes.map((note, i) => <span key={i} className="annotation" style={{ left: `${note.left}%`, top: `${note.top}%` }}>{note.label}</span>)}
  </div></div>;
}

async function json<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(String(response.status));
  return response.json() as Promise<T>;
}

export default function TrainingApp() {
  const [exercises, setExercises] = useState<ExerciseView[]>([]);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [step, setStep] = useState<Step>('group');
  const [selectedGroup, setSelectedGroup] = useState<GroupId | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<AttemptFeedback | null>(null);
  const [report, setReport] = useState<TrainingReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const exercise = exercises[questionIndex];

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
        if (progress.attemptCount >= catalog.exercises.length) {
          setReport(progress); setStep('report');
        } else {
          setQuestionIndex(progress.attemptCount);
        }
        window.localStorage.setItem('gogan-identity', JSON.stringify(session));
      } catch { if (active) setError('診断データを読み込めませんでした。通信状態を確認してください。'); }
    })();
    return () => { active = false; };
  }, []);

  const resetAnswer = () => { setStep('group'); setSelectedGroup(null); setSelectedReasons([]); setFeedback(null); startedAt.current = Date.now(); };
  const toggleReason = (id: string) => setSelectedReasons((now) => now.includes(id) ? now.filter((x) => x !== id) : [...now, id]);

  const showFeedback = async () => {
    if (!identity || !exercise || !selectedGroup || !selectedReasons.length) return;
    setBusy(true); setError(null);
    try {
      const result = await fetch('/api/attempts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...identity, exerciseId: exercise.id, selectedGroup, selectedReasons, responseMs: Date.now() - startedAt.current }) }).then(json<AttemptFeedback>);
      setFeedback(result); setStep('feedback');
    } catch { setError('回答を保存できませんでした。もう一度お試しください。'); }
    finally { setBusy(false); }
  };

  const loadReport = async () => {
    if (!identity) return;
    setBusy(true); setError(null);
    try {
      const result = await fetch(`/api/report?runId=${encodeURIComponent(identity.runId)}`, { cache: 'no-store' }).then(json<TrainingReport>);
      setReport(result); setStep('report');
    } catch { setError('診断結果を読み込めませんでした。もう一度お試しください。'); }
    finally { setBusy(false); }
  };

  const advance = () => {
    if (questionIndex === exercises.length - 1) { void loadReport(); return; }
    setQuestionIndex((i) => i + 1); resetAnswer();
  };

  const restart = async () => {
    if (!identity) return;
    setBusy(true);
    try {
      const next = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: identity.sessionId }) }).then(json<Identity>);
      setIdentity(next); window.localStorage.setItem('gogan-identity', JSON.stringify(next));
      setQuestionIndex(0); setReport(null); resetAnswer();
    } catch { setError('新しい診断を開始できませんでした。'); }
    finally { setBusy(false); }
  };

  if (error && !exercise) return <main className="app-frame"><section className="report"><div className="report-intro"><p className="question-number">CONNECTION ERROR</p><h1>診断を開始できませんでした。</h1><p>{error}</p><button className="primary-button" type="button" onClick={() => window.location.reload()}>再読み込み</button></div></section></main>;
  if (!exercise || !identity) return <main className="app-frame"><section className="report"><div className="report-intro"><p className="question-number">PREPARING</p><h1>診断を準備しています。</h1><p>問題と学習履歴を読み込んでいます。</p></div></section></main>;

  const playerName = exercise.player === 'black' ? '黒' : '白';
  const accuracy = report?.accuracy ?? 0;
  return <main className="app-frame">
    <header className="topbar">
      <a className="brand" href="#top" aria-label="碁眼 ホーム"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>碁眼 <small>GO-GAN</small></span></a>
      <div className="lesson-progress" aria-label={`診断の進捗 ${step === 'report' ? exercises.length : Math.min(questionIndex + 1, exercises.length)}問目`}><span>強弱ミニ診断</span><div className="progress-track"><i style={{ width: step === 'report' ? '100%' : `${(questionIndex + 1) / exercises.length * 100}%` }} /></div><strong>{step === 'report' ? exercises.length : questionIndex + 1} <small>/ {exercises.length}</small></strong></div>
      <span className="quiet-note">所要時間 約3分</span>
    </header>
    {step !== 'report' ? <section className="lesson" id="top">
      <div className="board-column"><div className="eyebrow"><span>判断軸 {String(questionIndex + 1).padStart(2, '0')}</span> {exercise.topic}</div><GoBoard exercise={exercise} feedback={feedback} selectedGroup={selectedGroup} step={step} onSelect={(group) => { setSelectedGroup(group); setStep('reason'); }} /><p className="board-caption"><b className="turn-stone" />あなたは{playerName}番です　A/Bはいずれも自分の{playerName}石です</p></div>
      <aside className="question-card" aria-live="polite">
        {step === 'group' && <><p className="perspective-label"><i />YOU ARE {exercise.player.toUpperCase()}</p><p className="question-number">QUESTION {String(questionIndex + 1).padStart(2, '0')}</p><h1>{exercise.prompt.split('\n').map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}</h1><p className="lead">{exercise.lead}</p><div className="hint-box"><span className="hint-icon">眼</span><div><strong>考える順番</strong><p>眼を作れるか。逃げた先に味方がいるか。</p></div></div><p className="tap-guide">自分の{playerName}石 <b>A</b> または <b>B</b> をタップ</p></>}
        {step === 'reason' && <><button className="back-link" type="button" onClick={resetAnswer}>← 一団を選び直す</button><p className="question-number">WHY?</p><h1>そう判断した根拠は<br />何ですか？</h1><p className="lead">当てはまるものをすべて選んでください。</p><div className="reason-list">{REASONS.map((reason, i) => <button key={reason.id} type="button" className={selectedReasons.includes(reason.id) ? 'active' : ''} onClick={() => toggleReason(reason.id)}><span>{String.fromCharCode(65 + i)}</span>{reason.label}<i aria-hidden="true">✓</i></button>)}</div>{error && <p className="personal-note">{error}</p>}<button className="primary-button" type="button" disabled={!selectedReasons.length || busy} onClick={showFeedback}>{busy ? '保存しています…' : '判断を確かめる'}</button></>}
        {step === 'feedback' && feedback && <><p className="result-label">{feedback.groupCorrect && feedback.reasonsCorrect ? 'その判断で正解です' : 'ここが今回の発見です'}</p><h1><em>{feedback.correctGroup.toUpperCase()}</em> {feedback.conclusion}</h1><p className="principle">{feedback.principle}</p><div className="explanation-steps">{feedback.explanations.map((item, i) => <div key={item.title} className={i === 2 ? 'muted' : ''}><span>{i + 1}</span><p><strong>{item.title}</strong>{item.body}</p></div>)}</div>{feedback.errorTag && <p className="personal-note">今回の回答から「{feedback.errorTag}」傾向の可能性を記録しました。</p>}{error && <p className="personal-note">{error}</p>}<button className="primary-button" type="button" disabled={busy} onClick={advance}>{busy ? '集計しています…' : questionIndex === exercises.length - 1 ? '診断結果を見る' : '次の問題へ'}</button></>}
      </aside>
    </section> : <section className="report" id="top">
      <div className="report-intro"><p className="question-number">COACH REPORT</p><h1>あなたの判断を、<br />3つの角度から見ました。</h1><p>これは棋力の採点ではありません。盤面を見るときの「いつもの順番」を見つけるための暫定診断です。</p></div>
      <div className="score-card"><span>判断の一致度</span><strong>{accuracy}<small>%</small></strong><div className="score-ring" style={{ '--score': `${accuracy * 3.6}deg` } as React.CSSProperties}><i /></div><p>{accuracy >= 80 ? '強弱を見る基準が安定しています。' : '形より先に、眼と逃げ道を確認すると伸びます。'}</p></div>
      <div className="report-grid"><article className="report-card strength"><span>現在の強み</span><h2>{(report?.groupAccuracy ?? 0) >= 67 ? '自分の弱い石を見つける視点' : '直感で盤面全体を見る力'}</h2><p>最善手を探す前に、自分の二つの一団を比較できています。</p></article><article className="report-card focus"><span>次に鍛える視点</span><h2>{report?.firstErrorTag ?? '逃げ道の具体的な比較'}</h2><p>次の練習では、眼形を確認したあとに「逃げた先の味方」を必ず探します。</p></article><article className="report-card method"><span>あなたのものさし</span><ol><li>眼を作れるか</li><li>逃げ道に味方がいるか</li><li>自分のAとBを比べる</li></ol></article></div>
      <div className="report-actions"><button className="primary-button" type="button" disabled={busy} onClick={restart}>{busy ? '準備しています…' : 'もう一度診断する'}</button><p>回答履歴は匿名で保存され、次回の診断改善に使われます。</p></div>
    </section>}
    <footer className="lesson-footer"><span>判断のものさし</span><p>① 眼はあるか　→　② 逃げ道はあるか　→　③ 自分の二つの一団を比べる</p></footer>
  </main>;
}
