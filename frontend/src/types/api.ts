export type MeResponse = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type QuizCard = { phraseId: number; englishText: string; japaneseText: string };
export type QuizTodayResponse = {
  alreadyShownToday: boolean;
  cards: QuizCard[];
};

export type CoverageRow = {
  categoryId: number;
  categoryName: string;
  masterTotal: number;
  uniqueSolved: number;
  coverageRate: number;
  totalAttempts: number;
};

export type TrendGranularity = "weekly" | "monthly";
export type TrendPoint = { period: string; attemptCount: number };
export type TrendResponse = { granularity: TrendGranularity; points: TrendPoint[] };

export type Category = { id: number; name: string; slug: string; sortOrder: number };
export type Problem = {
  id: number;
  categoryId: number;
  number: number;
  title: string;
  slug: string;
  hasUmpireExplanation: boolean;
};

export type AttemptListItem = {
  id: number;
  date: string;
  attemptNumber: number;
  title: string;
  number: number | null;
  categoryName: string | null;
  hasVideo: boolean;
  githubPushed: boolean;
};

export type AttemptFilters = { categoryId?: number; problemId?: number };

export type Phrase = { id: number; englishText: string; japaneseText: string };
export type PhraseInput = { id?: number; englishText: string; japaneseText: string };
export type AttemptInput = {
  date: string;
  problemId: number | null;
  customTitle?: string | null;
  customNumber?: number | null;
  categoryId?: number | null;
  code?: string | null;
  problemStatement?: string | null;
  videoUrl?: string | null;
  transcript?: string | null;
  retrospective?: string | null;
  umpireExplanation?: string | null;
  phrases: PhraseInput[];
};
export type AttemptDetail = {
  id: number;
  date: string;
  attemptNumber: number;
  problemId: number | null;
  customTitle: string | null;
  customNumber: number | null;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  title: string;
  number: number | null;
  code: string | null;
  problemStatement: string | null;
  umpireExplanation: string | null;
  videoUrl: string | null;
  transcript: string | null;
  retrospective: string | null;
  githubPushed: boolean;
  githubPath: string | null;
  phrases: Phrase[];
  createdAt: string;
  updatedAt: string;
};

export type ApiErrorBody = {
  error?: { code?: string; message?: string };
};

export type TranslateRequest = { english: string };
export type TranslateResponse = { japanese: string };

export type GenerateUmpireRequest = { problemStatement: string; force?: boolean };
export type GenerateUmpireResponse = { umpireExplanation: string; cached: boolean; generatedAt: string };

export type PreviewUmpireRequest = { problemStatement: string };
export type PreviewUmpireResponse = { umpireExplanation: string; generatedAt: string };

export type GithubCheckRequest = { attemptId: number };
export type GithubCheckResponse = { path: string; exists: boolean; createdByApp: boolean };

export type GithubPushRequest = { attemptId: number; content?: string; force?: boolean };
export type GithubPushResponse = { path: string; commitUrl: string; sha: string };
