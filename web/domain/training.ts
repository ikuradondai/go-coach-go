export type Step = 'group' | 'reason' | 'feedback' | 'report';
export type GroupId = 'a' | 'b';
export type PlayerColor = 'black' | 'white';

export type Stone = { x: number; y: number; color: PlayerColor; group?: GroupId };
export type BoardPoint = { left: number; top: number };

export type ExerciseDefinition = {
  id: string;
  version: number;
  player: PlayerColor;
  topic: string;
  prompt: string;
  lead: string;
  stones: Stone[];
  groupLabels: Record<GroupId, string>;
  targets: Record<GroupId, BoardPoint>;
  correctGroup: GroupId;
  correctReasons: string[];
  conclusion: string;
  principle: string;
  explanations: { title: string; body: string }[];
  boardNotes: ({ label: string } & BoardPoint)[];
  errorTag: string;
};

export type ExerciseView = Omit<ExerciseDefinition,
  'correctGroup' | 'correctReasons' | 'conclusion' | 'principle' | 'explanations' | 'boardNotes' | 'errorTag'>;

export type AttemptFeedback = {
  groupCorrect: boolean;
  reasonsCorrect: boolean;
  correctGroup: GroupId;
  conclusion: string;
  principle: string;
  explanations: ExerciseDefinition['explanations'];
  boardNotes: ExerciseDefinition['boardNotes'];
  errorTag: string | null;
};

export type TrainingReport = {
  attemptCount: number;
  accuracy: number;
  firstErrorTag: string | null;
  groupAccuracy: number;
  reasonAccuracy: number;
};

export const REASONS = [
  { id: 'eye', label: '眼を作る場所が少ない' },
  { id: 'escape', label: '逃げた先に味方がいない' },
  { id: 'count', label: '石の数が多い' },
  { id: 'context', label: '相手の強い石に囲まれている' },
] as const;
