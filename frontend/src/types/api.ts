export type MeResponse = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type QuizTodayResponse = {
  alreadyShownToday: boolean;
  cards: Array<{ id: number; englishText: string; japaneseText: string }>;
};

export type ApiErrorBody = {
  error?: { code?: string; message?: string };
};
