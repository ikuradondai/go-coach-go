'use client';

import { useMemo } from 'react';
import type { BoardPosition } from '@/domain/training';

export default function AdminGoBoard({ position, lastMove }: { position: BoardPosition; lastMove?: { x: number | null; y: number | null } }) {
  const lines = useMemo(() => Array.from({ length: position.size }), [position.size]);
  const percent = (value: number) => `${value / (position.size - 1) * 100}%`;
  const hoshi = position.size === 19 ? [3, 9, 15] : position.size === 13 ? [3, 6, 9] : [2, 4, 6];
  return <div className="admin-board-shell"><div className="admin-board" aria-label={`${position.size}路盤、${position.toPlay === 'black' ? '黒' : '白'}番`}>
    {lines.map((_, index) => <span className="admin-board-line vertical" key={`v-${index}`} style={{ left: percent(index) }} />)}
    {lines.map((_, index) => <span className="admin-board-line horizontal" key={`h-${index}`} style={{ top: percent(index) }} />)}
    {hoshi.flatMap((x) => hoshi.map((y) => <span className="admin-board-hoshi" key={`${x}-${y}`} style={{ left: percent(x), top: percent(y) }} />))}
    {position.stones.map((stone) => <span className={`admin-board-stone ${stone.color}`} key={`${stone.x}-${stone.y}`} style={{ left: percent(stone.x), top: percent(stone.y), width: `${90 / position.size}%` }}>
      {lastMove?.x === stone.x && lastMove?.y === stone.y && <i />}
    </span>)}
  </div></div>;
}
