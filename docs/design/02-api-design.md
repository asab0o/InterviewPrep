# REST API 設計（要件定義 v1.0 / 5章 MVP機能・13章認証対応）

## 共通事項
- ベースURL：`/api`（認証系のみ `/auth`）。
- 認証方式：GitHub OAuth（Passport.js）＋ express-session のセッションクッキー（6章・8章）。
- レスポンスは JSON。エラーは `{ "error": { "code": string, "message": string } }` 形式。
- 日付：記録日は `'YYYY-MM-DD'`。タイムスタンプは ISO8601 文字列で返す。
- CORS：**不要**。Amplify Hostingのリライト機能で `/api/<*>` `/auth/<*>` をLightsailへプロキシする
  方式を採用したため、ブラウザからは常に同一オリジン（Amplifyのドメイン）としか通信しない
  （`docs/infra-setup.md` 0章・7.2章参照。旧Q1は解決済み → `docs/design/05-open-questions.md`）。
  Express側にCORSミドルウェアは実装しない。
- セッションCookie：`SameSite=Lax; Secure` を本番で固定設定する（Amplify側は常にHTTPSなので
  ブラウザ視点の接続は常にSecure要件を満たす。Lightsail⇔nginx⇔CloudFront間はHTTPだが、
  これはCookieのSecure判定に影響しない＝Expressで`trust proxy`によるプロトコル判定は不要）。

### 認証・単一ユーザー制限をどのミドルウェアで担保するか（13章）
2層で担保する。

1. **ログイン時の拒否（Passport verify callback）**
   `passport.use(new GitHubStrategy(..., verify))` の verify 関数内で、GitHubから返る `profile.username` を
   `process.env.GITHUB_ALLOWED_USERNAME` と比較。不一致なら `done(null, false)` を返してセッションを作らせない
   → コールバックは 403 相当へ。ここが13章「許可ユーザー名以外はログイン不可」の主担保。

2. **全保護ルートでの `requireAuth` ミドルウェア**
   ```ts
   // src/middleware/requireAuth.ts
   export function requireAuth(req, res, next) {
     if (!req.isAuthenticated?.() || !req.user) {
       return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Login required' } });
     }
     // 二重防御：セッションに入っているユーザー名も許可ユーザーと一致するか毎回検証
     if (req.user.username !== process.env.GITHUB_ALLOWED_USERNAME) {
       return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Not the allowed user' } });
     }
     next();
   }
   ```
   `/api/*` 全体に `app.use('/api', requireAuth)` で適用（health除く）。verify callback をすり抜けたセッションも遮断する。

以降の表の「認証」列が「要」のものは `requireAuth` 配下。

---

## 1. 認証（6章・13章）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/auth/github` | 不要 | GitHub OAuth 認可画面へリダイレクト |
| GET | `/auth/github/callback` | 不要 | コールバック。verifyで許可ユーザー判定→セッション発行→フロントへリダイレクト。不許可は403ページ |
| POST | `/auth/logout` | 要 | セッション破棄 |
| GET | `/auth/me` | 要 | 現在のログインユーザー情報 |
| GET | `/health` | 不要 | ヘルスチェック（監視・Lightsail疎通用） |

`GET /auth/me` レスポンス：
```ts
type MeResponse = { username: string; displayName: string | null; avatarUrl: string | null };
```

---

## 2. カテゴリー / 問題マスタ（5.1・5.3）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/categories` | 要 | 有効カテゴリー一覧（sort_order順）。フォーム/ダッシュボードのプルダウン |
| GET | `/api/problems` | 要 | 問題一覧。`?categoryId=` で絞り込み（オートコンプリート候補） |
| GET | `/api/problems/:id` | 要 | 問題詳細（UMPIRE解説含む） |

```ts
type CategoryDTO = { id: number; name: string; slug: string; sortOrder: number };

// GET /api/problems?categoryId=2
type ProblemDTO = {
  id: number; categoryId: number; number: number; title: string; slug: string;
  hasUmpireExplanation: boolean;   // 生成済みかどうか（本文はここでは返さず一覧を軽量化）
};

// GET /api/problems/:id
type ProblemDetailDTO = ProblemDTO & {
  umpireExplanation: string | null;
  umpireGeneratedAt: string | null;
};
```

---

## 3. ダッシュボード（5.2）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/dashboard/coverage` | 要 | カテゴリー別 網羅率＋総アタック数 |
| GET | `/api/dashboard/trend` | 要 | 週次/月次の学習量推移。`?granularity=weekly\|monthly` |

```ts
// GET /api/dashboard/coverage
type CoverageRow = {
  categoryId: number;
  categoryName: string;
  masterTotal: number;      // 当該カテゴリーのProblemマスタ件数（網羅率の分母）
  uniqueSolved: number;     // 記録済みユニーク問題数（分子。problem_id紐付きのみカウント）
  coverageRate: number;     // uniqueSolved / masterTotal（0-1）
  totalAttempts: number;    // 総アタック数（複数回挑戦含む。マスタ紐付きAttempt件数）
};
type CoverageResponse = CoverageRow[];

// GET /api/dashboard/trend?granularity=weekly
type TrendPoint = { period: string; attemptCount: number }; // period例 週:"2026-W27" 月:"2026-07"
type TrendResponse = { granularity: 'weekly' | 'monthly'; points: TrendPoint[] };
```
> 注：網羅率の分子はマスタ紐付き（`problem_id`非NULL）のユニーク問題のみ。マスタ外（自由入力）はカウントしない（5.1）。
> 総アタック数もマスタ紐付きAttemptで集計するか、マスタ外も含めるかは → 要確認 Q2。上記は「マスタ紐付きのみ」を仮置き。

---

## 4. 解答記録 Attempt（5.3・5.8）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/attempts` | 要 | 記録一覧（日付降順）。`?categoryId=` `?problemId=` で絞り込み |
| GET | `/api/attempts/:id` | 要 | 記録詳細（フレーズ・UMPIRE・文字起こし含む） |
| POST | `/api/attempts` | 要 | 新規登録。attempt_number自動採番。phrasesネスト保存 |
| PUT | `/api/attempts/:id` | 要 | 編集（詳細→編集モード）。phrasesは全置換 |
| DELETE | `/api/attempts/:id` | 要 | 削除（提供有無は要確認 Q6） |

```ts
// 共通：フレーズ入力（英日ペア）
type PhraseInput = { englishText: string; japaneseText: string };

// POST /api/attempts  リクエスト
type CreateAttemptRequest = {
  date: string;                       // 'YYYY-MM-DD'
  problemId: number | null;           // マスタ選択時
  customTitle?: string | null;        // マスタ外時
  customNumber?: number | null;       // マスタ外時（GitHubファイル名用）
  categoryId?: number | null;         // マスタ外時のカテゴリー
  code?: string | null;
  problemStatement?: string | null;
  videoUrl?: string | null;
  transcript?: string | null;
  retrospective?: string | null;      // できなかったこと・つまずいた点（任意。push本文のCould Not Doに使用 = Q16）
  umpireExplanation?: string | null;  // マスタ外問題の解説（プレビュー生成結果を保存）
  phrases: PhraseInput[];
};
// attempt_number はサーバーが自動採番（同一 problemId、または customTitle の既存件数+1）→ 7章

// レスポンス（一覧行）
type AttemptListItem = {
  id: number; date: string; attemptNumber: number;
  title: string;                      // マスタ:problem.title / マスタ外:customTitle
  number: number | null;              // マスタ:problem.number / マスタ外:customNumber
  categoryName: string | null;
  hasVideo: boolean; githubPushed: boolean;
};

// GET /api/attempts/:id レスポンス（詳細）
type AttemptDetail = {
  id: number; date: string; attemptNumber: number;
  problemId: number | null; customTitle: string | null; customNumber: number | null;
  categoryId: number | null; categoryName: string | null; categorySlug: string | null;
  title: string; number: number | null;
  code: string | null;
  problemStatement: string | null;
  umpireExplanation: string | null;   // マスタ問題はProblem由来、マスタ外はAttempt由来を解決して返す
  videoUrl: string | null;
  transcript: string | null;
  retrospective: string | null;
  githubPushed: boolean; githubPath: string | null;
  phrases: { id: number; englishText: string; japaneseText: string }[];
  createdAt: string; updatedAt: string;
};
```
> PUT は同じ `CreateAttemptRequest` 形状。phrases は差分ではなく全置換（既存削除→再作成）でシンプルに保つ。attempt_number は編集時に再採番しない。

---

## 5. 翻訳サジェスト（5.3 / Haiku）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/translate` | 要 | 英語フレーズの日本語訳をClaude Haikuでサジェスト |

```ts
type TranslateRequest = { english: string };
type TranslateResponse = { japanese: string };
```
- サーバー側で `ANTHROPIC_API_KEY` を使い Haiku 系モデルを呼ぶ（6章：キーはフロントに出さない）。
- あくまで「提案」。フロントは採用/上書きを選べる。DB保存はしない（保存はAttempt保存時）。
- 使用モデルID（例 `claude-haiku-*`）の最終決定 → 要確認 Q3。

---

## 6. UMPIRE 解説生成（5.5 / Sonnet・キャッシュ再利用）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/problems/:id/umpire` | 要 | マスタ問題のUMPIRE生成/取得。キャッシュ再利用、`force`で再生成上書き |
| POST | `/api/umpire/preview` | 要 | マスタ外問題用。保存せず生成結果だけ返す（Attempt保存時に本体へ格納） |

```ts
// POST /api/problems/:id/umpire
type GenerateUmpireRequest = {
  problemStatement: string;  // フォームで貼り付けた問題文（先頭行に問題タイトルが自動挿入済 = 5.5）
  force?: boolean;           // true のときのみ再生成して Problem.umpire_explanation を上書き
};
type GenerateUmpireResponse = {
  umpireExplanation: string;
  cached: boolean;           // true = 既存キャッシュをそのまま返した（生成していない）
  generatedAt: string;
};
```
**サーバー側ロジック（5.5）**：
1. `force !== true` かつ `problem.umpireExplanation` が存在 → キャッシュを返す（`cached: true`）。Anthropic を呼ばない（コスト・待ち時間削減）。
2. それ以外 → 付録BのUMPIREプロンプトの `[PASTE LEETCODE PROBLEM HERE]` を `problemStatement` で置換し Sonnet 系で生成 → `Problem.umpireExplanation`/`umpireGeneratedAt` を上書き保存 → 返却（`cached: false`）。

```ts
// POST /api/umpire/preview（マスタ外問題。Problemレコードが無いケース）
type PreviewUmpireRequest = { problemStatement: string };
type PreviewUmpireResponse = { umpireExplanation: string; generatedAt: string };
```
> マスタ外は「1問1件キャッシュ」の対象マスタが存在しないため常に新規生成。生成結果は `CreateAttemptRequest.umpireExplanation` に載せて保存する運用。

プロンプト全文は付録Bを `src/services/umpirePrompt.ts` に定数として持つ。使用モデルID → 要確認 Q3。

---

## 7. GitHub 連携 push（5.4 / 上書き防止）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| POST | `/api/github/check` | 要 | 生成予定パスが既存かチェック（push前の警告用） |
| POST | `/api/github/push` | 要 | 該当リポジトリへメモ/コードをpush。上書き警告込み |

パス生成規則（5.4）：`problems/{category.slug}/{number}-{slug}.md`、2回目以降は末尾 `-{attemptNumber}`（例 `125-valid-palindrome-2.md`）。サーバーがAttemptから算出。

```ts
// POST /api/github/check
type GithubCheckRequest = { attemptId: number };
type GithubCheckResponse = {
  path: string;             // 算出された problems/... のパス
  exists: boolean;          // 同一パスが既にリポジトリに存在するか
  createdByApp: boolean;    // そのパスがアプリ管理下(githubPath一致)か。既存(Obsidian時代)は false
};

// POST /api/github/push
type GithubPushRequest = {
  attemptId: number;
  content?: string;         // 省略時はサーバーがAttemptからMarkdown組み立て
  force?: boolean;          // exists かつ force!=true のときはpushせず409で警告
};
type GithubPushResponse = { path: string; commitUrl: string; sha: string };
```
**サーバー側ロジック（5.4）**：
1. Attempt から `category.slug` / `number` / `slug` / `attemptNumber` を解決しパス算出。
2. GitHub Contents API で同一パスの存在チェック。
3. 存在し、かつ `force !== true` → **409 Conflict**（`{ error.code: 'FILE_EXISTS' }`）を返しフロントで警告表示。ユーザーが続行を選ぶと `force: true` で再送。
4. **競合回避ルール**：`createdByApp === false`（既存Obsidianファイル）へのpushは `force` でも拒否する方針とするか要確認 Q7。既定は「アプリ生成パス以外は触らない」。
5. 成功時 `attempts.githubPushed = true`、`attempts.githubPath = path` を保存。

**Markdown本文組み立て（`content` 省略時。5.4・Q16解決済み）**：フロントマターなし。以下の固定テンプレートで組み立てる。

```markdown
# {number}. {title} (Attempt {attemptNumber}) — {date}

## Code

```{language 未指定なら省略可}
{code}
```

## English
- {phrase.englishText} → {phrase.japaneseText}
（phrases が空配列なら見出しごと省略）

## Could Not Do
{retrospective}
（retrospective が null/空文字なら見出しごと省略）
```
`umpireExplanation` は本文に含めない（Problemマスタ側で1問1件管理・アプリ内参照が主目的のため）。フロントは push 前に組み立て結果をプレビュー表示し、必要なら `content` を上書きして自由編集した内容をそのままpushできる。

対象リポジトリは環境変数 `GITHUB_REPO_OWNER` / `GITHUB_REPO_NAME`（12章）。
**push権限のトークン（Q8で解決済み）**：ログイン用のGitHub OAuthとは別に、`leetcode-interview-prep`
リポジトリ1つ・`Contents: Read and write`権限のみに絞ったFine-grained PATを発行し、
環境変数 `GITHUB_PUSH_TOKEN` として保持する（`.env.example`参照）。ログイン用OAuthのスコープには
`repo` を含めない（認証専用に保つ）。GitHub Contents APIへのリクエストはこのPATを
`Authorization: Bearer <GITHUB_PUSH_TOKEN>` として送る。

---

## 8. フラッシュカード復習（5.6 / JST基準・1日1回・ランダム3問）

| メソッド | パス | 認証 | 説明 |
|---|---|---|---|
| GET | `/api/quiz/today` | 要 | 本日（JST）の出題を取得。未出題なら3問抽選＆QuizLog記録、出題済みなら its status |

```ts
type QuizCard = { phraseId: number; englishText: string; japaneseText: string };
type QuizTodayResponse = {
  alreadyShownToday: boolean;   // true = 本日既に出題済み（フロントは即ダッシュボードへ = 11章）
  cards: QuizCard[];            // 未出題時は最大3枚。ストック0なら空配列
};
```
**サーバー側ロジック（5.6・11章）**：
1. JST の今日の日付を算出（`Asia/Tokyo`。サーバーTZ非依存で計算）。
2. `quiz_logs` に `shown_date == JST今日` のレコードあり → `{ alreadyShownToday: true, cards: [] }`（2回目以降アクセス）。
3. なければ全 `phrases` から完全ランダム3件抽選（3未満はある分だけ、0件なら空）→ `quiz_logs` に `shown_date=JST今日, phrase_ids=[...]` を1件INSERT（UNIQUEでレース防止）→ `{ alreadyShownToday: false, cards }`。
4. フロントは表→裏（日本語→英語）で3問提示、完了/中断でダッシュボードへ（完了メッセージ無し）。

> 「最初に開いたタイミングで自動出題」を GET の副作用（QuizLog INSERT）で実現する設計。副作用をGETに持たせる是非、および複数タブ同時アクセス時の扱い → 要確認 Q9。UNIQUE制約で二重INSERTは防止。

---

## 9. 過去データインポート（5.7 / 開発時一回限りスクリプト）

HTTPエンドポイントではなく **CLIスクリプト**として提供（5.7「一回限りのスクリプト」）。

```
# 実行インターフェース（package.json scripts）
pnpm run import:legacy -- [--dry-run] [--source=github|local] [--path=<ローカルclone先>]

# 実体: src/scripts/import-legacy.ts （tsx 実行）
```

**入力**：`GITHUB_REPO_OWNER/GITHUB_REPO_NAME` の `problems/` 配下（`--source=github`、既定）、または `--path` で指定したローカルcloneの `problems/`。

**処理仕様（5.7）**：
1. `problems/{folder}/{file}.md` を走査。`folder` → Category.slug で Category 特定。
2. ファイル名を解析：
   - 新形式 `{number}-{slug}.md` / 再挑戦 `{number}-{slug}-{n}.md`。
   - 旧形式 `{number}. {Title}.md`（スペース入り、Obsidian時代）も解析対象。
   - `number` から Problem マスタ照合（一致すれば `problemId` 紐付け、なければマスタ外として `customTitle`/`customNumber`）。
3. `date` はファイルの **最終コミット日時** で代用（GitHub Commits API / `git log`）。
4. `attemptNumber` はファイル名末尾連番、無ければ同一問題内の登場順で採番。フレーズ等は空。
5. `--dry-run` は解析結果（生成予定Attempt一覧）を標準出力するのみでDB書き込みしない。

**出力**：Attemptレコードを一括INSERT（GitHubへの再pushはしない＝5.7）。冪等性（再実行時の重複防止キー）をどうするか → 要確認 Q10。

---

## エンドポイント一覧サマリー
```
GET    /health                         （認証不要）
GET    /auth/github                     （認証不要）
GET    /auth/github/callback            （認証不要 / verifyで単一ユーザー判定）
POST   /auth/logout
GET    /auth/me
GET    /api/categories
GET    /api/problems
GET    /api/problems/:id
GET    /api/dashboard/coverage
GET    /api/dashboard/trend
GET    /api/attempts
GET    /api/attempts/:id
POST   /api/attempts
PUT    /api/attempts/:id
DELETE /api/attempts/:id
POST   /api/translate                   （Haiku）
POST   /api/problems/:id/umpire         （Sonnet / キャッシュ再利用）
POST   /api/umpire/preview              （Sonnet / マスタ外）
POST   /api/github/check
POST   /api/github/push
GET    /api/quiz/today                   （JST 1日1回）
--- CLI（非HTTP） ---
pnpm run import:legacy                    （5.7 一回限り）
```
