export type ReviewStatus = 'unreviewed' | 'in_review' | 'approved' | 'changes_requested';
export type ReviewChecklist = {
  positionLegal: boolean;
  answerVerified: boolean;
  explanationAligned: boolean;
  sourceCleared: boolean;
  naturalPosition: boolean;
};

export const REVIEW_ITEMS: { id: keyof ReviewChecklist; label: string }[] = [
  { id: 'positionLegal', label: '盤面が合法で、手番と石配置に矛盾がない' },
  { id: 'answerVerified', label: '正解が明確で、別の見方でも逆転しない' },
  { id: 'explanationAligned', label: '解説が正解理由と一致している' },
  { id: 'sourceCleared', label: '出典と利用権限を確認した' },
  { id: 'naturalPosition', label: '実戦として不自然な配置ではない' },
];

export type ExerciseQualityRecord = {
  id: string;
  version: number;
  topic: string;
  stageTypes: string[];
  diagnosticTags: string[];
  profile: {
    difficulty: string;
    category: string;
    learningObjective: string;
    source: { kind: string; label: string; rightsStatus: string };
  };
  review: { status: ReviewStatus; checklist: ReviewChecklist; reviewerNote: string; updatedAt: string | null };
  metrics: { attemptCount: number; accuracy: number | null; averageResponseMs: number | null };
  alerts: string[];
};
