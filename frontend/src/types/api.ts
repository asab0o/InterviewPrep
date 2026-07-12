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

export type ApiErrorBody = {
  error?: { code?: string; message?: string };
};
