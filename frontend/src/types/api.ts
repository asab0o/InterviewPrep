export type MeResponse = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type QuizTodayResponse = {
  alreadyShownToday: boolean;
  cards: Array<{ id: number; englishText: string; japaneseText: string }>;
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

export type ApiErrorBody = {
  error?: { code?: string; message?: string };
};
