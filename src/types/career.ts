export type QuestionCategoryId =
  | 'interest'
  | 'aptitude'
  | 'environment'
  | 'values'
  | 'activities';

export interface QuestionCategory {
  id: QuestionCategoryId;
  label: string;
  shortLabel: string;
  description: string;
}

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
  isUnsure?: boolean;
}

export interface CareerQuestion {
  id: string;
  number: number;
  categoryId: QuestionCategoryId;
  prompt: string;
  helperText: string;
  selectionMode: 'single' | 'multiple';
  maxSelect?: number;
  options: QuestionOption[];
}

export type AnswerMap = Record<string, string[]>;

export interface SubmittedAnswerItem {
  questionId: string;
  number: number;
  category: string;
  prompt: string;
  selectedLabels: string[];
}

export interface RecommendedField {
  fieldName: string;
  summary: string;
  reasonFromAnswers: string;
  relatedEvidence: string[];
  cautionOrNote: string;
}

export interface ExplorationActivity {
  title: string;
  description: string;
  howToStart: string;
}

export interface CareerReport {
  headline: string;
  traitSummary: string;
  keyCharacteristics: string[];
  recommendedFields: RecommendedField[];
  reflectionQuestions: string[];
  suggestedActivities: ExplorationActivity[];
  selfDecisionPrompt: string;
  referenceNotice: string;
}

export interface ChatApiResponse {
  report: CareerReport;
  meta: {
    model: string;
    reasoningEffort: string;
    requestId?: string;
  };
}

export interface ChatApiErrorResponse {
  error: string;
  code?: string;
  retryAfterSeconds?: number;
}

