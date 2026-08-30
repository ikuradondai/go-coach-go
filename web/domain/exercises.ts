import {
  REASON_OPTIONS,
  type BoardPosition,
  type DiagnosticTag,
  type ExerciseDefinition,
  type ExerciseStage,
  type ExerciseView,
  type GroupCandidate,
  type PlayerColor,
  type Point,
  type Stone,
} from './training';

export const CATALOG_VERSION = 'strength-diagnostic-v2';

type Pattern = {
  id: string; topic: string; biasTag: DiagnosticTag; evidenceTag: DiagnosticTag;
  ownLabels: { a: string; b: string }; correctOwn: 'a' | 'b'; compareCorrect: 'own' | 'opponent';
  reasons: string[]; stones: Stone[]; conclusion: string; principle: string;
  explanations: { title: string; body: string }[];
};

type Transform = 'identity' | 'mirror' | 'rotate_swap';
const SIZE = 13;
const transforms: Transform[] = ['identity', 'mirror', 'rotate_swap'];

const patterns: Pattern[] = [
  {
    id: 'stone-count', topic: '石数と強さ', biasTag: 'stone_count_bias', evidenceTag: 'eye_space_miss',
    ownLabels: { a: '左上の黒2子', b: '中央の黒4子' }, correctOwn: 'b', compareCorrect: 'own',
    reasons: ['eye', 'context'], conclusion: '中央の自分の石が、盤上で最も急ぐ弱石です。',
    principle: '強さは石数ではなく、眼・逃げ道・連絡先という「生きる手段」の数で比べます。',
    explanations: [
      { title: '発見', body: '中央の4子は数が多くても、白に狭められて眼を作る場所がありません。' },
      { title: '比較', body: '相手の2子には辺へ展開する余地があり、自分の中央4子のほうが急です。' },
      { title: '転用', body: '石数を入れ替えた局面でも、最初に生きる手段を数えれば同じ判断ができます。' },
    ],
    stones: [
      { x: 2, y: 2, color: 'black', group: 'a' }, { x: 3, y: 2, color: 'black', group: 'a' },
      { x: 2, y: 3, color: 'black' }, { x: 4, y: 2, color: 'black' },
      { x: 6, y: 6, color: 'black', group: 'b' }, { x: 7, y: 6, color: 'black', group: 'b' }, { x: 7, y: 7, color: 'black', group: 'b' }, { x: 8, y: 7, color: 'black', group: 'b' },
      { x: 10, y: 10, color: 'black' },
      { x: 5, y: 6, color: 'white' }, { x: 6, y: 5, color: 'white' }, { x: 7, y: 5, color: 'white' }, { x: 8, y: 6, color: 'white' }, { x: 9, y: 7, color: 'white' }, { x: 8, y: 8, color: 'white' }, { x: 7, y: 8, color: 'white' },
      { x: 10, y: 2, color: 'white', group: 'c' }, { x: 10, y: 3, color: 'white', group: 'c' },
    ],
  },
  {
    id: 'connected-safe', topic: '連結と安全', biasTag: 'connected_means_safe', evidenceTag: 'escape_route_miss',
    ownLabels: { a: '左下の黒3子', b: '中央の黒5子' }, correctOwn: 'b', compareCorrect: 'own',
    reasons: ['eye', 'escape'], conclusion: 'つながった中央の5子を、先に安定させる必要があります。',
    principle: '連結は石を一団にするだけで、その一団の眼や逃げ道を保証しません。',
    explanations: [
      { title: '発見', body: '中央の5子は一続きですが、全体を背負ったまま白の壁から逃げる形です。' },
      { title: '比較', body: '白の壁は互いに支え合っており、攻められる側は自分の中央の一団です。' },
      { title: '転用', body: '石が長く連なって見えても、眼と出口を改めて確認します。' },
    ],
    stones: [
      { x: 2, y: 8, color: 'black', group: 'a' }, { x: 3, y: 8, color: 'black', group: 'a' }, { x: 3, y: 9, color: 'black', group: 'a' },
      { x: 2, y: 9, color: 'black' }, { x: 4, y: 10, color: 'black' },
      { x: 5, y: 6, color: 'black', group: 'b' }, { x: 6, y: 6, color: 'black', group: 'b' }, { x: 7, y: 6, color: 'black', group: 'b' }, { x: 7, y: 7, color: 'black', group: 'b' }, { x: 8, y: 7, color: 'black', group: 'b' },
      { x: 5, y: 4, color: 'white', group: 'c' }, { x: 6, y: 4, color: 'white', group: 'c' }, { x: 7, y: 4, color: 'white', group: 'c' }, { x: 8, y: 4, color: 'white', group: 'c' }, { x: 8, y: 5, color: 'white', group: 'c' },
      { x: 4, y: 6, color: 'white' }, { x: 6, y: 8, color: 'white' }, { x: 8, y: 8, color: 'white' }, { x: 9, y: 7, color: 'white' }, { x: 10, y: 10, color: 'white' },
    ],
  },
  {
    id: 'local-context', topic: '周囲の強さ', biasTag: 'local_context_bias', evidenceTag: 'local_context_bias',
    ownLabels: { a: '右上の黒3子', b: '左側の黒3子' }, correctOwn: 'b', compareCorrect: 'own',
    reasons: ['escape', 'context'], conclusion: '左側の自分の石は、白の厚みの近くで逃げ道を失っています。',
    principle: '同じ形でも、周囲が味方か相手かで石の強さは変わります。',
    explanations: [
      { title: '発見', body: '左側の3子だけを見ると普通の形ですが、すぐ上に強い白の壁があります。' },
      { title: '比較', body: '右上の3子には味方と盤端があり、左側の3子より生きる手段が多い状態です。' },
      { title: '転用', body: '形を見た後、必ず一歩引いて周囲の味方と相手を数えます。' },
    ],
    stones: [
      { x: 9, y: 2, color: 'black', group: 'a' }, { x: 10, y: 2, color: 'black', group: 'a' }, { x: 10, y: 3, color: 'black', group: 'a' },
      { x: 9, y: 3, color: 'black' }, { x: 11, y: 3, color: 'black' },
      { x: 4, y: 7, color: 'black', group: 'b' }, { x: 5, y: 7, color: 'black', group: 'b' }, { x: 5, y: 8, color: 'black', group: 'b' },
      { x: 2, y: 11, color: 'black' }, { x: 10, y: 10, color: 'black' },
      { x: 2, y: 5, color: 'white', group: 'c' }, { x: 3, y: 5, color: 'white', group: 'c' }, { x: 4, y: 5, color: 'white', group: 'c' }, { x: 5, y: 5, color: 'white', group: 'c' }, { x: 6, y: 5, color: 'white', group: 'c' },
      { x: 3, y: 7, color: 'white' }, { x: 4, y: 6, color: 'white' }, { x: 6, y: 7, color: 'white' }, { x: 6, y: 9, color: 'white' }, { x: 7, y: 8, color: 'white' },
    ],
  },
  {
    id: 'opponent-weakness', topic: '相手の弱石', biasTag: 'opponent_weakness_miss', evidenceTag: 'opponent_weakness_miss',
    ownLabels: { a: '左上の黒3子', b: '左下の黒3子' }, correctOwn: 'b', compareCorrect: 'opponent',
    reasons: ['eye', 'escape'], conclusion: '守る前に、孤立した相手の1子を攻める側へ回れます。',
    principle: '自分に弱みがあっても、相手がもっと弱ければ主導権を取れます。',
    explanations: [
      { title: '発見', body: '自分の二つの一団では左下がやや薄いものの、どちらにも辺の根拠があります。' },
      { title: '比較', body: '中央右の白1子には眼も連絡先もなく、盤上で最も弱いのは相手です。' },
      { title: '転用', body: '自分の石を見た直後に、同じ基準を相手の全ての一団にも適用します。' },
    ],
    stones: [
      { x: 2, y: 2, color: 'black', group: 'a' }, { x: 3, y: 2, color: 'black', group: 'a' }, { x: 3, y: 3, color: 'black', group: 'a' },
      { x: 3, y: 9, color: 'black', group: 'b' }, { x: 4, y: 9, color: 'black', group: 'b' }, { x: 4, y: 10, color: 'black', group: 'b' },
      { x: 8, y: 5, color: 'black' }, { x: 9, y: 5, color: 'black' }, { x: 10, y: 5, color: 'black' }, { x: 8, y: 6, color: 'black' }, { x: 10, y: 6, color: 'black' }, { x: 9, y: 7, color: 'black' },
      { x: 9, y: 6, color: 'white', group: 'c' },
      { x: 8, y: 2, color: 'white' }, { x: 9, y: 2, color: 'white' }, { x: 10, y: 2, color: 'white' },
      { x: 2, y: 6, color: 'white' }, { x: 2, y: 7, color: 'white' }, { x: 3, y: 7, color: 'white' },
      { x: 6, y: 10, color: 'white' }, { x: 7, y: 10, color: 'white' }, { x: 7, y: 11, color: 'white' },
      { x: 11, y: 9, color: 'white' }, { x: 11, y: 10, color: 'white' },
    ],
  },
];

function mapPoint(point: Point, transform: Transform): Point {
  if (transform === 'mirror') return { x: SIZE - 1 - point.x, y: point.y };
  if (transform === 'rotate_swap') return { x: SIZE - 1 - point.x, y: SIZE - 1 - point.y };
  return point;
}

function swapColor(color: PlayerColor): PlayerColor { return color === 'black' ? 'white' : 'black'; }

function transformPosition(pattern: Pattern, transform: Transform, label: string): BoardPosition {
  return {
    size: SIZE, toPlay: transform === 'rotate_swap' ? 'white' : 'black',
    stones: pattern.stones.map((stone) => ({
      ...mapPoint(stone, transform), color: transform === 'rotate_swap' ? swapColor(stone.color) : stone.color, group: stone.group,
    })),
    source: { kind: 'authored', label },
  };
}

function center(position: BoardPosition, groupId: string) {
  const stones = position.stones.filter((stone) => stone.group === groupId);
  return {
    left: stones.reduce((sum, stone) => sum + stone.x, 0) / stones.length / (position.size - 1) * 100,
    top: stones.reduce((sum, stone) => sum + stone.y, 0) / stones.length / (position.size - 1) * 100,
  };
}

function candidate(position: BoardPosition, id: string, label: string, marker: string): GroupCandidate {
  return { id, label, marker, target: center(position, id) };
}

function colorName(position: BoardPosition) { return position.toPlay === 'black' ? '黒' : '白'; }

function buildExercise(pattern: Pattern, variant: number): ExerciseDefinition {
  const position = transformPosition(pattern, transforms[variant], `碁眼オリジナル・${pattern.topic}`);
  const transferPosition = transformPosition(pattern, transforms[(variant + 1) % transforms.length], `転用局面・${pattern.topic}`);
  const player = colorName(position);
  const opponent = player === '黒' ? '白' : '黒';
  const ownWeak = pattern.correctOwn;
  const compareCorrect = pattern.compareCorrect === 'own' ? ownWeak : 'c';
  const ownCandidates = [candidate(position, 'a', pattern.ownLabels.a.replace('黒', player), 'A'), candidate(position, 'b', pattern.ownLabels.b.replace('黒', player), 'B')];
  const stages: ExerciseStage[] = [
    { id: 'discover', type: 'select_group', diagnosticTag: 'weak_group_detection', prompt: `あなたは${player}番です。\n自分の弱い一団をタップしてください。`, lead: 'まず自分の石だけを見て、眼・逃げ道・連絡先を確認します。', candidates: ownCandidates, correctAnswer: ownWeak },
    { id: 'compare', type: 'compare_groups', diagnosticTag: pattern.biasTag, prompt: '自分の弱石と相手の注目すべき一団、\nより弱いのはどちらですか？', lead: '同じ判断基準を相手にも適用して比較します。', candidates: [candidate(position, ownWeak, ownCandidates.find((item) => item.id === ownWeak)!.label, '自'), candidate(position, 'c', `${opponent}の注目する一団`, '相')], correctAnswer: compareCorrect },
    { id: 'evidence', type: 'select_evidence', diagnosticTag: pattern.evidenceTag, prompt: 'その比較を支える根拠は？', lead: '当てはまるものをすべて選んでください。', options: REASON_OPTIONS, minSelections: 1, correctAnswers: pattern.reasons },
    { id: 'transfer', type: 'transfer_check', diagnosticTag: 'transfer_failure', position: transferPosition, prompt: '配置が変わっても、\n同じ判断ができますか？', lead: '別の向き・別の手番でも、生きる手段を比較してください。', candidates: [candidate(transferPosition, ownWeak, `${colorName(transferPosition)}の弱石`, '自'), candidate(transferPosition, 'c', `${colorName(transferPosition) === '黒' ? '白' : '黒'}の一団`, '相')], correctAnswer: compareCorrect },
  ];
  return {
    id: `${CATALOG_VERSION}-${pattern.id}-${variant + 1}`, version: 1, topic: pattern.topic, position, stages,
    diagnosticTags: [...new Set(stages.map((stage) => stage.diagnosticTag))],
    contentProfile: { difficulty: variant === 0 ? '基礎' : '応用', category: '強弱', learningObjective: pattern.principle, source: { kind: 'original', label: '碁眼オリジナル診断局面', rightsStatus: 'owned' } },
    feedback: { conclusion: pattern.conclusion, principle: pattern.principle, explanations: pattern.explanations, boardNotes: [{ label: '自分の弱石', ...center(position, ownWeak) }, { label: pattern.compareCorrect === 'opponent' ? '相手のほうが弱い' : '相手と比較', ...center(position, 'c') }] },
  };
}

export const EXERCISE_CATALOG: ExerciseDefinition[] = patterns.flatMap((pattern) => transforms.map((_, variant) => buildExercise(pattern, variant)));

function assertConnected(position: BoardPosition, groupId: string) {
  const stones = position.stones.filter((stone) => stone.group === groupId);
  if (!stones.length) throw new Error(`Missing group ${groupId}`);
  const keys = new Set(stones.map((stone) => `${stone.x},${stone.y}`));
  const seen = new Set<string>();
  const queue = [stones[0]];
  while (queue.length) {
    const stone = queue.shift()!;
    const key = `${stone.x},${stone.y}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = `${stone.x + dx},${stone.y + dy}`;
      if (keys.has(next) && !seen.has(next)) queue.push({ ...stone, x: stone.x + dx, y: stone.y + dy });
    }
  }
  if (seen.size !== stones.length) throw new Error(`Disconnected group ${groupId}`);
}

function validatePosition(position: BoardPosition, exerciseId: string) {
  const occupied = new Set(position.stones.map((stone) => `${stone.x},${stone.y}`));
  const black = position.stones.filter((stone) => stone.color === 'black').length;
  const white = position.stones.length - black;
  if (occupied.size !== position.stones.length || black !== white) throw new Error(`Invalid position ${exerciseId}`);
  for (const id of ['a', 'b', 'c']) assertConnected(position, id);
}

const hashes = new Set<string>();
for (const exercise of EXERCISE_CATALOG) {
  validatePosition(exercise.position, exercise.id);
  const transfer = exercise.stages.find((stage) => stage.type === 'transfer_check');
  if (!transfer) throw new Error(`Missing transfer stage ${exercise.id}`);
  validatePosition(transfer.position, `${exercise.id}:transfer`);
  if (exercise.stages.map((stage) => stage.id).join(',') !== 'discover,compare,evidence,transfer') throw new Error(`Invalid diagnostic flow ${exercise.id}`);
  const hash = JSON.stringify(exercise.position.stones.map(({ x, y, color, group }) => [x, y, color, group]));
  if (hashes.has(hash)) throw new Error(`Duplicate position ${exercise.id}`);
  hashes.add(hash);
}

export function toExerciseView(exercise: ExerciseDefinition): ExerciseView {
  return { id: exercise.id, version: exercise.version, topic: exercise.topic, position: exercise.position, stages: exercise.stages.map((stage) => {
    if (stage.type === 'select_evidence') { const { correctAnswers: _answer, ...publicStage } = stage; return publicStage; }
    const { correctAnswer: _answer, ...publicStage } = stage; return publicStage;
  }) };
}
