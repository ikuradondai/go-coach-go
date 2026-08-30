import type { ParsedSgfGame, PositionSnapshot } from '@/domain/sgf';
import type { PlayerColor, Stone } from '@/domain/training';

const key = (x: number, y: number) => `${x}:${y}`;
const neighbors = (x: number, y: number, size: number) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < size && ny < size);

function removeCaptured(board: Map<string, Stone>, x: number, y: number, color: PlayerColor, size: number) {
  const opponent = color === 'black' ? 'white' : 'black';
  for (const [nx, ny] of neighbors(x, y, size)) {
    const adjacent = board.get(key(nx, ny));
    if (!adjacent || adjacent.color !== opponent) continue;
    const group: Stone[] = [];
    const seen = new Set<string>();
    const queue = [adjacent];
    let hasLiberty = false;
    while (queue.length) {
      const stone = queue.pop()!;
      const stoneKey = key(stone.x, stone.y);
      if (seen.has(stoneKey)) continue;
      seen.add(stoneKey); group.push(stone);
      for (const [gx, gy] of neighbors(stone.x, stone.y, size)) {
        const next = board.get(key(gx, gy));
        if (!next) hasLiberty = true;
        else if (next.color === opponent && !seen.has(key(gx, gy))) queue.push(next);
      }
    }
    if (!hasLiberty) group.forEach((stone) => board.delete(key(stone.x, stone.y)));
  }
}

export function positionAt(game: ParsedSgfGame, moveNumber: number): PositionSnapshot {
  const board = new Map<string, Stone>();
  for (const stone of game.initialStones) board.set(key(stone.x, stone.y), { x: stone.x, y: stone.y, color: stone.color === 'B' ? 'black' : 'white' });
  for (const move of game.moves.slice(0, moveNumber)) {
    if (move.x === null || move.y === null) continue;
    const color: PlayerColor = move.color === 'B' ? 'black' : 'white';
    board.set(key(move.x, move.y), { x: move.x, y: move.y, color });
    removeCaptured(board, move.x, move.y, color, game.size);
  }
  const last = game.moves[moveNumber - 1];
  const toPlay: PlayerColor = last ? (last.color === 'B' ? 'white' : 'black') : (game.moves[0]?.color === 'W' ? 'white' : 'black');
  return { stones: [...board.values()], toPlay };
}
