import type { ExerciseDefinition, ExerciseView, Stone } from './training';

const corners: Stone[] = [
  { x: 3, y: 3, color: 'black' }, { x: 15, y: 3, color: 'white' },
  { x: 3, y: 15, color: 'white' }, { x: 15, y: 15, color: 'black' },
];

export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  {
    id: 'living-options', version: 1, player: 'black', topic: '石数と強さ',
    prompt: '黒のAとB、\nより弱いのはどちらですか？',
    lead: '黒番として、自分の二つの一団を比べてください。',
    stones: [...corners,
      { x: 8, y: 7, color: 'black', group: 'a' }, { x: 9, y: 7, color: 'black', group: 'a' }, { x: 8, y: 8, color: 'black', group: 'a' },
      { x: 7, y: 6, color: 'white' }, { x: 8, y: 5, color: 'white' }, { x: 9, y: 5, color: 'white' }, { x: 10, y: 6, color: 'white' }, { x: 10, y: 8, color: 'white' },
      { x: 12, y: 9, color: 'black', group: 'b' }, { x: 13, y: 9, color: 'black', group: 'b' }, { x: 13, y: 10, color: 'black', group: 'b' }, { x: 14, y: 10, color: 'black', group: 'b' },
      { x: 12, y: 8, color: 'white' }, { x: 13, y: 7, color: 'white' }, { x: 15, y: 9, color: 'white' }, { x: 13, y: 12, color: 'white' },
      { x: 6, y: 12, color: 'black' }, { x: 7, y: 13, color: 'black' }, { x: 5, y: 14, color: 'white' }, { x: 6, y: 15, color: 'white' },
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
    id: 'connected-safety', version: 1, player: 'black', topic: '連結と安全',
    prompt: '黒のAとB、\n先に手を入れるべきは？',
    lead: '黒番として、放置したときにより困る一団を選んでください。',
    stones: [...corners,
      { x: 4, y: 8, color: 'white' }, { x: 4, y: 9, color: 'white' }, { x: 5, y: 9, color: 'white' }, { x: 3, y: 7, color: 'white' }, { x: 2, y: 8, color: 'white' }, { x: 3, y: 11, color: 'white' },
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
    id: 'relative-strength', version: 1, player: 'black', topic: '強弱の相対性',
    prompt: '周囲まで見たとき、\n弱い黒石はAとBのどちら？',
    lead: '黒番として、同じ3子でも周囲の環境まで含めて比べてください。',
    stones: [...corners,
      { x: 13, y: 5, color: 'black', group: 'a' }, { x: 14, y: 5, color: 'black', group: 'a' }, { x: 14, y: 6, color: 'black', group: 'a' },
      { x: 15, y: 4, color: 'black' }, { x: 16, y: 6, color: 'black' }, { x: 12, y: 3, color: 'black' },
      { x: 6, y: 12, color: 'black', group: 'b' }, { x: 7, y: 12, color: 'black', group: 'b' }, { x: 7, y: 13, color: 'black', group: 'b' },
      { x: 5, y: 11, color: 'white' }, { x: 6, y: 10, color: 'white' }, { x: 8, y: 11, color: 'white' }, { x: 9, y: 12, color: 'white' }, { x: 7, y: 15, color: 'white' },
      { x: 11, y: 6, color: 'white' }, { x: 12, y: 7, color: 'white' }, { x: 4, y: 5, color: 'white' }, { x: 5, y: 5, color: 'white' },
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

for (const exercise of EXERCISE_CATALOG) {
  const blackCount = exercise.stones.filter((stone) => stone.color === 'black').length;
  const whiteCount = exercise.stones.filter((stone) => stone.color === 'white').length;
  const occupied = new Set(exercise.stones.map((stone) => `${stone.x},${stone.y}`));
  const candidateColors = new Set(exercise.stones.filter((stone) => stone.group).map((stone) => stone.color));
  if (blackCount !== whiteCount || occupied.size !== exercise.stones.length || candidateColors.size !== 1 || !candidateColors.has(exercise.player)) {
    throw new Error(`Invalid exercise position: ${exercise.id}`);
  }
}

export function toExerciseView(exercise: ExerciseDefinition): ExerciseView {
  const { correctGroup: _group, correctReasons: _reasons, conclusion: _conclusion, principle: _principle,
    explanations: _explanations, boardNotes: _notes, errorTag: _error, ...view } = exercise;
  return view;
}
