'use client';

import { useMemo, useState } from 'react';

type Step = 'group' | 'reason' | 'feedback' | 'report';
type GroupId = 'a' | 'b';
type Stone = { x: number; y: number; color: 'black' | 'white'; group?: GroupId };
type Exercise = {
  id: string;
  player: 'black' | 'white';
  topic: string;
  prompt: string;
  lead: string;
  stones: Stone[];
  groupLabels: Record<GroupId, string>;
  targets: Record<GroupId, { left: number; top: number }>;
  correctGroup: GroupId;
  correctReasons: string[];
  conclusion: string;
  principle: string;
  explanations: { title: string; body: string }[];
  boardNotes: { label: string; left: number; top: number }[];
  errorTag: string;
};

const corners: Stone[] = [
  { x: 3, y: 3, color: 'black' }, { x: 15, y: 3, color: 'white' },
  { x: 3, y: 15, color: 'white' }, { x: 15, y: 15, color: 'black' },
];

const exercises: Exercise[] = [
  {
    id: 'living-options', player: 'black', topic: '石数と強さ',
    prompt: '黒のAとB、\nより弱いのはどちらですか？',
    lead: '黒番として、自分の二つの一団を比べてください。',
    stones: [...corners,
      { x: 8, y: 7, color: 'black', group: 'a' }, { x: 9, y: 7, color: 'black', group: 'a' }, { x: 8, y: 8, color: 'black', group: 'a' },
      { x: 7, y: 6, color: 'white' }, { x: 8, y: 5, color: 'white' }, { x: 9, y: 5, color: 'white' }, { x: 10, y: 6, color: 'white' }, { x: 10, y: 8, color: 'white' },
      { x: 12, y: 9, color: 'black', group: 'b' }, { x: 13, y: 9, color: 'black', group: 'b' }, { x: 13, y: 10, color: 'black', group: 'b' }, { x: 14, y: 10, color: 'black', group: 'b' },
      { x: 12, y: 8, color: 'white' }, { x: 13, y: 7, color: 'white' }, { x: 15, y: 9, color: 'white' }, { x: 13, y: 12, color: 'white' },
      { x: 6, y: 12, color: 'black' }, { x: 7, y: 13, color: 'black' },
      { x: 5, y: 14, color: 'white' }, { x: 6, y: 15, color: 'white' },
      { x: 5, y: 3, color: 'black' }, { x: 6, y: 4, color: 'black' },
    ],
    groupLabels: { a: '中央の黒3子', b: '右辺の黒4子' }, targets: { a: { left: 39, top: 37 }, b: { left: 82, top: 48 } },
    correctGroup: 'b', correctReasons: ['eye', 'escape'], conclusion: 'Bの黒石のほうが弱い一団です。',
    principle: '石の数ではなく、生きる手段の数を比べます。',
    explanations: [
      { title: '眼形', body: '黒Bは白に周囲を狭められ、眼を二つ作る余地がほとんどありません。' },
      { title: '逃げ道', body: '中央へ逃げても、つながれる黒石がなく、白から追われ続けます。' },
      { title: 'Aと比較する', body: '黒Aにも眼はありませんが、左下の黒石へ逃げる方向が残っています。' },
    ],
    boardNotes: [{ label: '眼形なし', left: 56, top: 40 }, { label: '味方がいない', left: 72, top: 64 }], errorTag: '石数を強さと混同',
  },
  {
    id: 'connected-safety', player: 'black', topic: '連結と安全',
    prompt: '黒のAとB、\n先に手を入れるべきは？',
    lead: '黒番として、放置したときにより困る一団を選んでください。',
    stones: [...corners,
      { x: 4, y: 8, color: 'white' }, { x: 4, y: 9, color: 'white' }, { x: 5, y: 9, color: 'white' },
      { x: 3, y: 7, color: 'white' }, { x: 2, y: 8, color: 'white' }, { x: 3, y: 11, color: 'white' },
      { x: 10, y: 9, color: 'black', group: 'b' }, { x: 11, y: 9, color: 'black', group: 'b' }, { x: 11, y: 10, color: 'black', group: 'b' }, { x: 12, y: 10, color: 'black', group: 'b' },
      { x: 9, y: 8, color: 'white' }, { x: 10, y: 7, color: 'white' }, { x: 12, y: 8, color: 'white' }, { x: 13, y: 9, color: 'white' }, { x: 11, y: 12, color: 'white' },
      { x: 6, y: 8, color: 'black' }, { x: 5, y: 11, color: 'black' },
      { x: 6, y: 6, color: 'black', group: 'a' }, { x: 7, y: 6, color: 'black', group: 'a' }, { x: 7, y: 5, color: 'black', group: 'a' },
      { x: 6, y: 13, color: 'black' }, { x: 7, y: 14, color: 'black' },
    ],
    groupLabels: { a: '上辺寄りの黒3子', b: '中央の黒4子' }, targets: { a: { left: 38, top: 24 }, b: { left: 61, top: 44 } },
    correctGroup: 'b', correctReasons: ['eye', 'context'], conclusion: 'Bの黒石は、連結していても弱い状態です。',
    principle: 'つながった石は、一団全体で生きる場所を必要とします。',
    explanations: [
      { title: '眼形', body: '黒4子は中央で白に囲まれ、眼を作る空間を持っていません。' },
      { title: '周囲の強さ', body: '逃げる方向にも白石が待っていて、動くほど重くなります。' },
      { title: 'Aと比較する', body: '黒Aは上辺へ展開でき、左上の黒石へ連絡する方向も残っています。' },
    ],
    boardNotes: [{ label: '囲まれている', left: 48, top: 37 }, { label: '全体が重い', left: 63, top: 66 }], errorTag: 'つながっていれば安全と判断',
  },
  {
    id: 'relative-strength', player: 'black', topic: '強弱の相対性',
    prompt: '周囲まで見たとき、\n弱い黒石はAとBのどちら？',
    lead: '黒番として、同じ3子でも周囲の環境まで含めて比べてください。',
    stones: [...corners,
      { x: 13, y: 5, color: 'black', group: 'a' }, { x: 14, y: 5, color: 'black', group: 'a' }, { x: 14, y: 6, color: 'black', group: 'a' },
      { x: 15, y: 4, color: 'black' }, { x: 16, y: 6, color: 'black' }, { x: 12, y: 3, color: 'black' },
      { x: 6, y: 12, color: 'black', group: 'b' }, { x: 7, y: 12, color: 'black', group: 'b' }, { x: 7, y: 13, color: 'black', group: 'b' },
      { x: 5, y: 11, color: 'white' }, { x: 6, y: 10, color: 'white' }, { x: 8, y: 11, color: 'white' }, { x: 9, y: 12, color: 'white' }, { x: 7, y: 15, color: 'white' },
      { x: 11, y: 6, color: 'white' }, { x: 12, y: 7, color: 'white' },
      { x: 4, y: 5, color: 'white' }, { x: 5, y: 5, color: 'white' },
    ],
    groupLabels: { a: '右上の黒3子', b: '左下の黒3子' }, targets: { a: { left: 72, top: 22 }, b: { left: 31, top: 67 } },
    correctGroup: 'b', correctReasons: ['escape', 'context'], conclusion: 'Bの黒石は、白の厚みの中で孤立しています。',
    principle: '石の強さは形だけでなく、周囲との関係で決まります。',
    explanations: [
      { title: '逃げ道', body: '黒Bはどの方向へ動いても白石にぶつかり、楽な出口がありません。' },
      { title: '周囲の強さ', body: '左下一帯は白の石が多く、黒Bにとって敵の勢力圏です。' },
      { title: 'Aと比較する', body: '黒Aは右上の味方へすぐ連絡でき、盤端で根拠も作れます。' },
    ],
    boardNotes: [{ label: '白の勢力圏', left: 23, top: 58 }, { label: '孤立', left: 42, top: 76 }], errorTag: '局所の形だけで判断',
  },
];

for (const exercise of exercises) {
  const blackCount = exercise.stones.filter((stone) => stone.color === 'black').length;
  const whiteCount = exercise.stones.filter((stone) => stone.color === 'white').length;
  const occupied = new Set(exercise.stones.map((stone) => `${stone.x},${stone.y}`));
  const candidateColors = new Set(exercise.stones.filter((stone) => stone.group).map((stone) => stone.color));

  if (blackCount !== whiteCount || occupied.size !== exercise.stones.length || candidateColors.size !== 1 || !candidateColors.has(exercise.player)) {
    throw new Error(`Invalid exercise position: ${exercise.id}`);
  }
}

const reasons = [
  { id: 'eye', label: '眼を作る場所が少ない' },
  { id: 'escape', label: '逃げた先に味方がいない' },
  { id: 'count', label: '石の数が多い' },
  { id: 'context', label: '相手の強い石に囲まれている' },
];

function GoBoard({ exercise, selectedGroup, step, onSelect }: { exercise: Exercise; selectedGroup: GroupId | null; step: Step; onSelect: (group: GroupId) => void }) {
  const gridLines = useMemo(() => Array.from({ length: 19 }), []);
  return (
    <div className="board-shell">
      <div className="board" aria-label={`19路の囲碁盤。${exercise.player === 'black' ? '黒' : '白'}のAとBを比較します`}>
        <div className="grid-lines" aria-hidden="true">
          {gridLines.map((_, i) => <span key={`v-${i}`} className="line vertical" style={{ left: `${(i / 18) * 100}%` }} />)}
          {gridLines.map((_, i) => <span key={`h-${i}`} className="line horizontal" style={{ top: `${(i / 18) * 100}%` }} />)}
          {[3, 9, 15].flatMap((x) => [3, 9, 15].map((y) => <span key={`${x}-${y}`} className="hoshi" style={{ left: `${(x / 18) * 100}%`, top: `${(y / 18) * 100}%` }} />))}
        </div>
        {exercise.stones.map((stone, i) => {
          const selectable = Boolean(stone.group) && step === 'group';
          const selected = stone.group && selectedGroup === stone.group;
          const correct = step === 'feedback' && stone.group === exercise.correctGroup;
          return <button key={`${stone.x}-${stone.y}-${i}`} type="button" aria-label={`${stone.color === 'black' ? '黒' : '白'}石 ${stone.group ? `選択肢${stone.group.toUpperCase()}` : ''}`} className={`stone ${stone.color} ${selectable ? 'selectable' : ''} ${selected ? 'selected' : ''} ${correct ? 'correct' : ''}`} style={{ left: `${(stone.x / 18) * 100}%`, top: `${(stone.y / 18) * 100}%` }} onClick={() => stone.group && selectable && onSelect(stone.group)} disabled={!selectable} />;
        })}
        {step === 'group' && (['a', 'b'] as GroupId[]).map((group) => <button key={group} className="group-target" type="button" style={{ left: `${exercise.targets[group].left}%`, top: `${exercise.targets[group].top}%` }} onClick={() => onSelect(group)} aria-label={`${group.toUpperCase()} ${exercise.groupLabels[group]}`}><span>{group.toUpperCase()}</span></button>)}
        {step === 'feedback' && exercise.boardNotes.map((note, i) => <span key={i} className="annotation" style={{ left: `${note.left}%`, top: `${note.top}%` }}>{note.label}</span>)}
      </div>
    </div>
  );
}

export default function Home() {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [step, setStep] = useState<Step>('group');
  const [selectedGroup, setSelectedGroup] = useState<GroupId | null>(null);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<{ id: string; groupCorrect: boolean; reasonsCorrect: boolean; errorTag: string }[]>([]);
  const exercise = exercises[questionIndex];

  const resetAnswer = () => { setStep('group'); setSelectedGroup(null); setSelectedReasons([]); };
  const toggleReason = (id: string) => setSelectedReasons((now) => now.includes(id) ? now.filter((x) => x !== id) : [...now, id]);
  const groupCorrect = selectedGroup === exercise.correctGroup;
  const reasonsCorrect = exercise.correctReasons.every((id) => selectedReasons.includes(id)) && !selectedReasons.includes('count');

  const showFeedback = () => {
    const next = [...attempts, { id: exercise.id, groupCorrect, reasonsCorrect, errorTag: exercise.errorTag }];
    setAttempts(next); setStep('feedback');
    window.localStorage.setItem('gogan-latest-attempts', JSON.stringify(next));
  };

  const advance = () => {
    if (questionIndex === exercises.length - 1) { setStep('report'); return; }
    setQuestionIndex((i) => i + 1); resetAnswer();
  };

  const restart = () => { setQuestionIndex(0); setAttempts([]); resetAnswer(); };
  const score = attempts.reduce((sum, attempt) => sum + (attempt.groupCorrect ? 60 : 0) + (attempt.reasonsCorrect ? 40 : 0), 0);
  const accuracy = attempts.length ? Math.round(score / attempts.length) : 0;
  const misses = attempts.filter((a) => !a.groupCorrect || !a.reasonsCorrect);

  return (
    <main className="app-frame">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="碁眼 ホーム"><span className="brand-mark" aria-hidden="true"><i /><i /></span><span>碁眼 <small>GO-GAN</small></span></a>
        <div className="lesson-progress" aria-label={`診断の進捗 ${Math.min(questionIndex + 1, exercises.length)}問目`}>
          <span>強弱ミニ診断</span><div className="progress-track"><i style={{ width: step === 'report' ? '100%' : `${((questionIndex + 1) / exercises.length) * 100}%` }} /></div><strong>{step === 'report' ? exercises.length : questionIndex + 1} <small>/ {exercises.length}</small></strong>
        </div>
        <span className="quiet-note">所要時間 約3分</span>
      </header>

      {step !== 'report' ? (
        <section className="lesson" id="top">
          <div className="board-column"><div className="eyebrow"><span>判断軸 {String(questionIndex + 1).padStart(2, '0')}</span> {exercise.topic}</div><GoBoard exercise={exercise} selectedGroup={selectedGroup} step={step} onSelect={(group) => { setSelectedGroup(group); setStep('reason'); }} /><p className="board-caption"><b className="turn-stone" />あなたは黒番です　A/Bはいずれも自分の黒石です</p></div>
          <aside className="question-card" aria-live="polite">
            {step === 'group' && <><p className="perspective-label"><i />YOU ARE BLACK</p><p className="question-number">QUESTION {String(questionIndex + 1).padStart(2, '0')}</p><h1>{exercise.prompt.split('\n').map((line, i) => <span key={line}>{line}{i === 0 && <br />}</span>)}</h1><p className="lead">{exercise.lead}</p><div className="hint-box"><span className="hint-icon">眼</span><div><strong>考える順番</strong><p>眼を作れるか。逃げた先に味方がいるか。</p></div></div><p className="tap-guide">自分の黒石 <b>A</b> または <b>B</b> をタップ</p></>}
            {step === 'reason' && <><button className="back-link" type="button" onClick={resetAnswer}>← 一団を選び直す</button><p className="question-number">WHY?</p><h1>そう判断した根拠は<br />何ですか？</h1><p className="lead">当てはまるものをすべて選んでください。</p><div className="reason-list">{reasons.map((reason, i) => <button key={reason.id} type="button" className={selectedReasons.includes(reason.id) ? 'active' : ''} onClick={() => toggleReason(reason.id)}><span>{String.fromCharCode(65 + i)}</span>{reason.label}<i aria-hidden="true">✓</i></button>)}</div><button className="primary-button" type="button" disabled={!selectedReasons.length} onClick={showFeedback}>判断を確かめる</button></>}
            {step === 'feedback' && <><p className="result-label">{groupCorrect && reasonsCorrect ? 'その判断で正解です' : 'ここが今回の発見です'}</p><h1><em>{exercise.correctGroup.toUpperCase()}</em> {exercise.conclusion}</h1><p className="principle">{exercise.principle}</p><div className="explanation-steps">{exercise.explanations.map((item, i) => <div key={item.title} className={i === 2 ? 'muted' : ''}><span>{i + 1}</span><p><strong>{item.title}</strong>{item.body}</p></div>)}</div>{(!groupCorrect || !reasonsCorrect) && <p className="personal-note">今回の回答から「{exercise.errorTag}」傾向の可能性を記録しました。</p>}<button className="primary-button" type="button" onClick={advance}>{questionIndex === exercises.length - 1 ? '診断結果を見る' : '次の問題へ'}</button></>}
          </aside>
        </section>
      ) : (
        <section className="report" id="top">
          <div className="report-intro"><p className="question-number">COACH REPORT</p><h1>あなたの判断を、<br />3つの角度から見ました。</h1><p>これは棋力の採点ではありません。盤面を見るときの「いつもの順番」を見つけるための暫定診断です。</p></div>
          <div className="score-card"><span>判断の一致度</span><strong>{accuracy}<small>%</small></strong><div className="score-ring" style={{ '--score': `${accuracy * 3.6}deg` } as React.CSSProperties}><i /></div><p>{accuracy >= 80 ? '強弱を見る基準が安定しています。' : '形より先に、眼と逃げ道を確認すると伸びます。'}</p></div>
          <div className="report-grid">
            <article className="report-card strength"><span>現在の強み</span><h2>{attempts.some((a) => a.groupCorrect) ? '自分の弱い石を見つける視点' : '直感で盤面全体を見る力'}</h2><p>最善手を探す前に、自分の二つの一団を比較できています。</p></article>
            <article className="report-card focus"><span>次に鍛える視点</span><h2>{misses[0]?.errorTag ?? '逃げ道の具体的な比較'}</h2><p>次の練習では、眼形を確認したあとに「逃げた先の味方」を必ず探します。</p></article>
            <article className="report-card method"><span>あなたのものさし</span><ol><li>眼を作れるか</li><li>逃げ道に味方がいるか</li><li>自分のAとBを比べる</li></ol></article>
          </div>
          <div className="report-actions"><button className="primary-button" type="button" onClick={restart}>もう一度診断する</button><p>回答はこの端末にのみ保存されています。</p></div>
        </section>
      )}
      <footer className="lesson-footer"><span>判断のものさし</span><p>① 眼はあるか　→　② 逃げ道はあるか　→　③ 自分の二つの一団を比べる</p></footer>
    </main>
  );
}
