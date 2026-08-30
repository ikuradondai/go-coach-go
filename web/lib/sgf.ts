import { parse, type SgfNode } from '@sabaki/sgf';
import type { ParsedSgfGame, SgfMove } from '@/domain/sgf';

const SGF_LETTERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const KATAGO_COLUMNS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

function vertexToPoint(vertex: string, size: number) {
  if (!vertex) return { x: null, y: null };
  const x = SGF_LETTERS.indexOf(vertex[0]);
  const y = SGF_LETTERS.indexOf(vertex[1]);
  return x >= 0 && y >= 0 && x < size && y < size ? { x, y } : { x: null, y: null };
}

export function sgfVertexToKataGo(vertex: string, size: number) {
  const { x, y } = vertexToPoint(vertex, size);
  return x === null || y === null ? 'pass' : `${KATAGO_COLUMNS[x]}${size - y}`;
}

function allNodes(root: SgfNode): SgfNode[] {
  return [root, ...root.children.flatMap(allNodes)];
}

export function parseSgf(contents: string): ParsedSgfGame {
  const roots = parse(contents);
  if (roots.length !== 1) throw new Error('SGFは1局だけ含むファイルにしてください');
  const root = roots[0];
  const size = Number(root.data.SZ?.[0] ?? 19);
  if (![9, 13, 19].includes(size)) throw new Error('9路・13路・19路のSGFに対応しています');
  const initialStones: ParsedSgfGame['initialStones'] = [];
  for (const [property, color] of [['AB', 'B'], ['AW', 'W']] as const) {
    for (const vertex of root.data[property] ?? []) {
      const point = vertexToPoint(vertex, size);
      if (point.x === null || point.y === null) throw new Error('置き石の座標が不正です');
      initialStones.push({ color, vertex, x: point.x, y: point.y });
    }
  }
  const moves: SgfMove[] = [];
  let node: SgfNode | undefined = root;
  while (node) {
    const color = node.data.B ? 'B' : node.data.W ? 'W' : null;
    if (color) {
      const vertex = node.data[color]?.[0] ?? '';
      moves.push({ color, vertex, ...vertexToPoint(vertex, size) });
    }
    node = node.children[0];
  }
  if (moves.length > 1000) throw new Error('1000手を超えるSGFは取り込めません');
  return {
    size: size as 9 | 13 | 19,
    rules: root.data.RU?.[0] || 'japanese',
    komi: Number(root.data.KM?.[0] ?? 6.5),
    blackPlayer: root.data.PB?.[0] ?? '',
    whitePlayer: root.data.PW?.[0] ?? '',
    initialStones,
    moves,
    variationCount: allNodes(root).filter((item) => item.children.length > 1).reduce((sum, item) => sum + item.children.length - 1, 0),
  };
}
