import { REASON_OPTIONS, type ExerciseDefinition, type ExerciseStage, type ExerciseView, type PlayerColor, type Stone } from './training';

type LegacySeed = {
  id: string; version: number; player: PlayerColor; topic: string; prompt: string; lead: string;
  stones: Stone[]; groupLabels: Record<string, string>; targets: Record<string, { left: number; top: number }>;
  correctGroup: string; correctReasons: string[]; conclusion: string; principle: string;
  explanations: { title: string; body: string }[];
  boardNotes: { label: string; left: number; top: number }[]; errorTag: string;
};

const corners: Stone[] = [
  { x: 3, y: 3, color: 'black' }, { x: 15, y: 3, color: 'white' },
  { x: 3, y: 15, color: 'white' }, { x: 15, y: 15, color: 'black' },
];

const legacySeeds: LegacySeed[] = [
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
  {
    id: 'base-before-running', version: 1, player: 'black', topic: '根拠と逃げ道',
    prompt: '黒のAとB、\n根拠が乏しいのはどちら？',
    lead: '逃げ出す前に、辺で眼形を作れる余地を比べてください。',
    stones: [...corners,
      { x: 4, y: 8, color: 'black', group: 'a' }, { x: 5, y: 8, color: 'black', group: 'a' }, { x: 5, y: 9, color: 'black', group: 'a' },
      { x: 13, y: 4, color: 'black', group: 'b' }, { x: 14, y: 4, color: 'black', group: 'b' }, { x: 14, y: 5, color: 'black', group: 'b' },
      { x: 15, y: 5, color: 'black' }, { x: 12, y: 3, color: 'black' },
      { x: 3, y: 7, color: 'white' }, { x: 4, y: 6, color: 'white' }, { x: 6, y: 7, color: 'white' }, { x: 6, y: 9, color: 'white' }, { x: 5, y: 11, color: 'white' },
      { x: 10, y: 13, color: 'white' }, { x: 11, y: 14, color: 'white' }, { x: 13, y: 13, color: 'white' },
    ],
    groupLabels: { a: '左辺の黒3子', b: '右上の黒3子' }, targets: { a: { left: 26, top: 47 }, b: { left: 76, top: 24 } },
    correctGroup: 'a', correctReasons: ['eye', 'context'], conclusion: 'Aの黒石は、辺にいても根拠がありません。',
    principle: '盤端に近いだけでは安全ではなく、眼を作る空間が必要です。',
    explanations: [
      { title: '根拠', body: '左辺の黒3子は白に上下を押さえられ、辺を使って眼形を作る幅が足りません。' },
      { title: '周囲', body: '中央へ向かう方向にも白石があり、逃げるだけでは安定しません。' },
      { title: 'もう一方と比較', body: '右上の黒3子は上辺の味方と連絡でき、根拠を広げる余地があります。' },
    ],
    boardNotes: [{ label: '根拠が狭い', left: 20, top: 51 }, { label: '白が待つ', left: 35, top: 39 }], errorTag: '辺にいれば安全と判断',
  },
  {
    id: 'cut-risk', version: 1, player: 'black', topic: '切断の危険',
    prompt: '黒のAとB、\n切られると困るのはどちら？',
    lead: '石の形だけでなく、切断後に二つの弱石が生まれるかを見ます。',
    stones: [...corners,
      { x: 8, y: 7, color: 'black', group: 'a' }, { x: 9, y: 7, color: 'black', group: 'a' }, { x: 10, y: 8, color: 'black', group: 'a' },
      { x: 5, y: 12, color: 'black', group: 'b' }, { x: 6, y: 12, color: 'black', group: 'b' }, { x: 6, y: 13, color: 'black', group: 'b' },
      { x: 4, y: 13, color: 'black' }, { x: 5, y: 14, color: 'black' },
      { x: 8, y: 6, color: 'white' }, { x: 9, y: 8, color: 'white' }, { x: 10, y: 7, color: 'white' }, { x: 11, y: 8, color: 'white' }, { x: 9, y: 10, color: 'white' },
      { x: 13, y: 5, color: 'white' }, { x: 14, y: 6, color: 'white' }, { x: 13, y: 12, color: 'white' },
    ],
    groupLabels: { a: '中央の黒3子', b: '左下の黒3子' }, targets: { a: { left: 51, top: 39 }, b: { left: 31, top: 69 } },
    correctGroup: 'a', correctReasons: ['escape', 'context'], conclusion: 'Aの黒石は切断されると、二つの弱い一団になります。',
    principle: '切断の価値は、切った後に弱石がいくつ生まれるかで測ります。',
    explanations: [
      { title: '切断点', body: '中央の黒石は連絡が薄く、白に割かれると左右を同時に守れません。' },
      { title: '逃げ道', body: '分断後はどちらの黒石にも近い味方がなく、白に追われます。' },
      { title: 'もう一方と比較', body: '左下の黒石は周囲の黒石と一体で動けるため、切断の被害が小さい形です。' },
    ],
    boardNotes: [{ label: '切断点', left: 50, top: 43 }, { label: '二つの弱石', left: 59, top: 55 }], errorTag: '切断後を読まずに判断',
  },
  {
    id: 'edge-root', version: 1, player: 'black', topic: '辺の根拠',
    prompt: '黒のAとB、\n先に安定させるべきは？',
    lead: '辺で根拠を持てる石と、中央で浮いている石を比べます。',
    stones: [...corners,
      { x: 4, y: 4, color: 'black', group: 'a' }, { x: 5, y: 4, color: 'black', group: 'a' }, { x: 5, y: 5, color: 'black', group: 'a' },
      { x: 10, y: 10, color: 'black', group: 'b' }, { x: 11, y: 10, color: 'black', group: 'b' }, { x: 11, y: 11, color: 'black', group: 'b' },
      { x: 14, y: 14, color: 'black' }, { x: 15, y: 13, color: 'black' },
      { x: 7, y: 4, color: 'white' }, { x: 6, y: 6, color: 'white' }, { x: 9, y: 9, color: 'white' }, { x: 12, y: 9, color: 'white' }, { x: 12, y: 11, color: 'white' },
      { x: 10, y: 13, color: 'white' }, { x: 6, y: 13, color: 'white' }, { x: 7, y: 14, color: 'white' },
    ],
    groupLabels: { a: '左上の黒3子', b: '中央の黒3子' }, targets: { a: { left: 27, top: 24 }, b: { left: 58, top: 58 } },
    correctGroup: 'b', correctReasons: ['eye', 'escape'], conclusion: 'Bの黒石は中央で浮き、根拠も逃げ先もありません。',
    principle: '中央の石は盤端を使えないぶん、連絡先と逃げ道が重要です。',
    explanations: [
      { title: '根拠', body: '中央の黒3子は眼を作る場所がなく、単独では生きられません。' },
      { title: '逃げ道', body: '進行方向を白石に先回りされ、近い黒石への連絡も遠い状態です。' },
      { title: 'もう一方と比較', body: '左上の黒3子は上辺と左辺を使って眼形を作る余地があります。' },
    ],
    boardNotes: [{ label: '浮き石', left: 62, top: 63 }, { label: '連絡が遠い', left: 72, top: 72 }], errorTag: '中央の浮き石を軽視',
  },
  {
    id: 'enemy-thickness', version: 1, player: 'black', topic: '厚みとの距離',
    prompt: '黒のAとB、\n白の厚みに近すぎるのは？',
    lead: '同じ石数でも、相手の強い石との距離で危険度が変わります。',
    stones: [...corners,
      { x: 6, y: 9, color: 'black', group: 'a' }, { x: 7, y: 9, color: 'black', group: 'a' }, { x: 7, y: 10, color: 'black', group: 'a' },
      { x: 13, y: 10, color: 'black', group: 'b' }, { x: 14, y: 10, color: 'black', group: 'b' }, { x: 14, y: 11, color: 'black', group: 'b' },
      { x: 15, y: 12, color: 'black' }, { x: 13, y: 13, color: 'black' },
      { x: 4, y: 7, color: 'white' }, { x: 5, y: 7, color: 'white' }, { x: 5, y: 8, color: 'white' }, { x: 4, y: 10, color: 'white' }, { x: 5, y: 11, color: 'white' },
      { x: 8, y: 12, color: 'white' }, { x: 10, y: 5, color: 'white' }, { x: 11, y: 5, color: 'white' },
    ],
    groupLabels: { a: '左側の黒3子', b: '右側の黒3子' }, targets: { a: { left: 37, top: 53 }, b: { left: 76, top: 58 } },
    correctGroup: 'a', correctReasons: ['escape', 'context'], conclusion: 'Aの黒石は白の厚みに押しつけられています。',
    principle: '相手の厚みに近い弱石は、逃げるほど相手を働かせます。',
    explanations: [
      { title: '周囲の強さ', body: '左側の白石は連結していて強く、近くの黒3子を厳しく攻められます。' },
      { title: '逃げ道', body: '黒が中央へ逃げると、白は厚みを利用して先回りできます。' },
      { title: 'もう一方と比較', body: '右側の黒3子には近い味方があり、連絡して安定する道があります。' },
    ],
    boardNotes: [{ label: '白の厚み', left: 23, top: 45 }, { label: '追われる方向', left: 43, top: 62 }], errorTag: '相手の厚みとの距離を無視',
  },
  {
    id: 'light-and-heavy', version: 1, player: 'black', topic: '石の軽重',
    prompt: '黒のAとB、\n重くなっているのはどちら？',
    lead: '石数の多さではなく、捨てにくさと動きにくさを比べてください。',
    stones: [...corners,
      { x: 5, y: 6, color: 'black', group: 'a' }, { x: 6, y: 6, color: 'black', group: 'a' },
      { x: 11, y: 10, color: 'black', group: 'b' }, { x: 12, y: 10, color: 'black', group: 'b' }, { x: 12, y: 11, color: 'black', group: 'b' }, { x: 13, y: 11, color: 'black', group: 'b' }, { x: 13, y: 12, color: 'black', group: 'b' },
      { x: 4, y: 4, color: 'black' },
      { x: 10, y: 9, color: 'white' }, { x: 11, y: 8, color: 'white' }, { x: 13, y: 9, color: 'white' }, { x: 14, y: 10, color: 'white' }, { x: 14, y: 12, color: 'white' },
      { x: 12, y: 14, color: 'white' }, { x: 7, y: 8, color: 'white' }, { x: 8, y: 5, color: 'white' },
    ],
    groupLabels: { a: '左上の黒2子', b: '右下寄りの黒5子' }, targets: { a: { left: 31, top: 34 }, b: { left: 68, top: 61 } },
    correctGroup: 'b', correctReasons: ['eye', 'context'], conclusion: 'Bの黒石は数が増えたぶん、捨てにくい重い一団です。',
    principle: '弱い石へ無目的に足すと、守る価値だけが増えて重くなります。',
    explanations: [
      { title: '眼形', body: '右下寄りの黒5子は石数が多くても、眼を作る空間がありません。' },
      { title: '重さ', body: '白に囲まれた黒石は捨てる損が大きく、動くたびに追加の手が必要です。' },
      { title: 'もう一方と比較', body: '左上の黒2子は少数で身軽なので、必要なら捨てても被害を限定できます。' },
    ],
    boardNotes: [{ label: '石数だけ増えた', left: 61, top: 55 }, { label: '眼形なし', left: 73, top: 70 }], errorTag: '石を足せば強くなると判断',
  },
];

for (const exercise of legacySeeds) {
  const blackCount = exercise.stones.filter((stone) => stone.color === 'black').length;
  const whiteCount = exercise.stones.filter((stone) => stone.color === 'white').length;
  const occupied = new Set(exercise.stones.map((stone) => `${stone.x},${stone.y}`));
  const candidateColors = new Set(exercise.stones.filter((stone) => stone.group).map((stone) => stone.color));
  if (blackCount !== whiteCount || occupied.size !== exercise.stones.length || candidateColors.size !== 1 || !candidateColors.has(exercise.player)) {
    throw new Error(`Invalid exercise position: ${exercise.id}`);
  }
}

function stagesFor(seed: LegacySeed, index: number): ExerciseStage[] {
  const candidates = ['a', 'b'].map((id) => ({ id, label: seed.groupLabels[id], marker: id.toUpperCase(), target: seed.targets[id] }));
  const evidence: ExerciseStage = {
    id: 'evidence', type: 'select_evidence', prompt: 'そう判断した根拠は何ですか？',
    lead: '当てはまるものをすべて選んでください。', options: REASON_OPTIONS,
    minSelections: 1, correctAnswers: seed.correctReasons,
  };

  if (index % 3 === 0) return [
    { id: 'comparison', type: 'compare_groups', prompt: seed.prompt, lead: seed.lead, candidates, correctAnswer: seed.correctGroup },
    evidence,
  ];
  if (index % 3 === 1) return [
    { id: 'weak-group', type: 'select_group', prompt: '今すぐ手を入れるべき黒石を盤上から選んでください。', lead: 'ラベルではなく、盤面全体を見て弱い一団を探します。', candidates, correctAnswer: seed.correctGroup },
    evidence,
  ];
  return [
    {
      id: 'priority', type: 'urgent_or_large', prompt: '黒番はいま、急場と大場のどちらを優先すべきですか？',
      lead: '弱い石を放置した結果まで想像してください。',
      options: [
        { id: 'urgent', label: `急場：${seed.groupLabels[seed.correctGroup]}の処置`, detail: '弱い一団への対応を先に考える' },
        { id: 'large', label: '大場：空いている右辺へ先行', detail: '地になりそうな広い場所を取る' },
      ],
      correctAnswer: 'urgent',
    },
  ];
}

export const EXERCISE_CATALOG: ExerciseDefinition[] = legacySeeds.map((seed, index) => ({
  id: seed.id,
  version: 3,
  topic: seed.topic,
  position: { size: 19, toPlay: seed.player, stones: seed.stones, source: { kind: 'authored' } },
  stages: stagesFor(seed, index),
  diagnosticTags: [seed.errorTag],
  contentProfile: {
    difficulty: index === 0 ? '入門' : '基礎',
    category: index % 3 === 2 ? '急場と大場' : '強弱',
    learningObjective: index % 3 === 0 ? '二つの一団を眼・逃げ道・周囲の強さで比較する' : index % 3 === 1 ? '盤面全体から先に扱うべき弱石を発見する' : '弱石への対応を大場より優先する',
    source: { kind: 'original', label: '碁眼オリジナル局面', rightsStatus: 'owned' },
  },
  feedback: {
    conclusion: index === 0 ? seed.conclusion : seed.conclusion.replaceAll('黒B', seed.groupLabels.b).replace(/^Bの黒石/, seed.groupLabels.b),
    principle: seed.principle,
    explanations: seed.explanations.map((item) => index === 0 ? item : ({
      title: item.title === 'Aと比較する' ? 'もう一方と比較する' : item.title,
      body: item.body.replaceAll('黒B', seed.groupLabels.b).replaceAll('黒A', seed.groupLabels.a),
    })),
    boardNotes: seed.boardNotes,
  },
}));

export function toExerciseView(exercise: ExerciseDefinition): ExerciseView {
  return {
    id: exercise.id,
    version: exercise.version,
    topic: exercise.topic,
    position: exercise.position,
    stages: exercise.stages.map((stage) => {
      if (stage.type === 'select_evidence') {
        const { correctAnswers: _answer, ...publicStage } = stage;
        return publicStage;
      }
      const { correctAnswer: _answer, ...publicStage } = stage;
      return publicStage;
    }),
  };
}
