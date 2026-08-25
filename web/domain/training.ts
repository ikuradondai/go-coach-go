export type PlayerColor = 'black' | 'white';
export type Point = { x: number; y: number };
export type BoardPoint = { left: number; top: number };
export type Stone = Point & { color: PlayerColor; group?: string };
export type AnswerValue = string | string[];
export type ExerciseAnswers = Record<string, AnswerValue>;

export type BoardPosition = {
  size: 9 | 13 | 19;
  toPlay: PlayerColor;
  stones: Stone[];
  crop?: { x: number; y: number; width: number; height: number };
  source?: { kind: 'authored' | 'sgf'; label?: string; moveNumber?: number };
};

export type ChoiceOption = { id: string; label: string; detail?: string };
export type GroupCandidate = { id: string; label: string; marker: string; target: BoardPoint };
export type MoveCandidate = Point & { id: string; label: string };

type StageBase = { id: string; prompt: string; lead?: string };
export type CompareGroupsStage = StageBase & {
  type: 'compare_groups'; candidates: GroupCandidate[]; allowSame?: boolean; correctAnswer: string;
};
export type SelectGroupStage = StageBase & {
  type: 'select_group'; candidates: GroupCandidate[]; correctAnswer: string;
};
export type SelectEvidenceStage = StageBase & {
  type: 'select_evidence'; options: ChoiceOption[]; minSelections?: number; correctAnswers: string[];
};
export type SingleChoiceStage = StageBase & {
  type: 'urgent_or_large' | 'choose_plan'; options: ChoiceOption[]; correctAnswer: string;
};
export type ChooseMoveStage = StageBase & {
  type: 'choose_move'; candidates: MoveCandidate[]; correctAnswer: string;
};
export type ExerciseStage = CompareGroupsStage | SelectGroupStage | SelectEvidenceStage | SingleChoiceStage | ChooseMoveStage;

export type PublicStage =
  | Omit<CompareGroupsStage, 'correctAnswer'>
  | Omit<SelectGroupStage, 'correctAnswer'>
  | Omit<SelectEvidenceStage, 'correctAnswers'>
  | Omit<SingleChoiceStage, 'correctAnswer'>
  | Omit<ChooseMoveStage, 'correctAnswer'>;

export type ExerciseFeedback = {
  conclusion: string;
  principle: string;
  explanations: { title: string; body: string }[];
  boardNotes: ({ label: string } & BoardPoint)[];
};

export type ExerciseDefinition = {
  id: string;
  version: number;
  topic: string;
  position: BoardPosition;
  stages: ExerciseStage[];
  diagnosticTags: string[];
  contentProfile: {
    difficulty: '入門' | '基礎' | '応用';
    category: '生死' | '強弱' | '急場と大場' | '構想' | '着手';
    learningObjective: string;
    source: { kind: 'original' | 'licensed_sgf' | 'user_sgf'; label: string; rightsStatus: 'owned' | 'cleared' | 'private_only' };
  };
  feedback: ExerciseFeedback;
};

export type ExerciseView = Omit<ExerciseDefinition, 'stages' | 'feedback' | 'diagnosticTags' | 'contentProfile'> & {
  stages: PublicStage[];
};

export type AttemptFeedback = ExerciseFeedback & {
  allCorrect: boolean;
  stageResults: Record<string, boolean>;
  correctAnswers: ExerciseAnswers;
  errorTag: string | null;
};

export type TrainingReport = {
  attemptCount: number;
  accuracy: number;
  firstErrorTag: string | null;
  groupAccuracy: number;
  reasonAccuracy: number;
};

export const REASON_OPTIONS: ChoiceOption[] = [
  { id: 'eye', label: '眼を作る場所が少ない' },
  { id: 'escape', label: '逃げた先に味方がいない' },
  { id: 'count', label: '石の数が多い' },
  { id: 'context', label: '相手の強い石に囲まれている' },
];

export function isMultiSelect(stage: PublicStage | ExerciseStage): stage is SelectEvidenceStage {
  return stage.type === 'select_evidence';
}
