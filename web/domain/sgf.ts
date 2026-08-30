import type { BoardPosition, PlayerColor, Stone } from './training';

export type SgfMove = { color: 'B' | 'W'; vertex: string; x: number | null; y: number | null };
export type ParsedSgfGame = {
  size: 9 | 13 | 19;
  rules: string;
  komi: number;
  blackPlayer: string;
  whitePlayer: string;
  initialStones: Array<{ color: 'B' | 'W'; vertex: string; x: number; y: number }>;
  moves: SgfMove[];
  variationCount: number;
};

export type SgfImportSummary = {
  id: string;
  fileName: string;
  boardSize: number;
  rules: string;
  komi: number;
  blackPlayer: string;
  whitePlayer: string;
  moveCount: number;
  variationCount: number;
  createdAt: string;
};

export type KataGoMoveInfo = { move: string; visits: number; winrate: number; scoreLead: number; order: number; pv?: string[] };
export type KataGoResult = {
  id: string;
  turnNumber?: number;
  rootInfo: { visits: number; winrate: number; scoreLead: number };
  moveInfos: KataGoMoveInfo[];
  ownership?: number[];
};

export type PositionCandidate = {
  id: string;
  importId: string;
  moveNumber: number;
  toPlay: PlayerColor;
  position: BoardPosition;
  status: 'selected' | 'analysis_pending' | 'analysis_complete' | 'analysis_failed';
  createdAt: string;
  analysis: null | { id: string; status: 'pending' | 'running' | 'complete' | 'failed'; visits: number; result: KataGoResult | null; error: string | null; createdAt: string };
};

export type PositionSnapshot = { stones: Stone[]; toPlay: PlayerColor };
