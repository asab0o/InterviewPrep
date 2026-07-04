# フロントエンド構成設計（React + Vite + TypeScript + Tailwind / 11章5画面対応）

## 技術前提（8章）
- React + Vite + TypeScript + Tailwind の SPA。AWS Amplify Hosting に静的デプロイ。
- APIキーは持たない。すべて Express バックエンド経由（6章）。
- レスポンシブ必須（スマホ閲覧・PC編集 / 6章）。
- **APIアクセスはプロキシ方式**：Amplify Hostingのリライト機能で `/api/<*>` `/auth/<*>` を
  Lightsailへ転送するため（`docs/infra-setup.md` 0章・7.2章）、フロントは常に**相対パス**
  （例 `fetch('/api/attempts')`）でアクセスする。絶対URLの環境変数（`VITE_API_BASE_URL`等）は不要。
  ローカル開発時も同様に、Vite dev serverの `server.proxy` 設定で `/api` `/auth` を
  `http://localhost:3000`（ローカルExpress）へプロキシし、本番と同じ「常に同一オリジン」の
  前提をdev環境でも再現する（CORS設定が本番・開発のどちらにも不要になる）。

## ルーティング構成（React Router / 11章）

| パス | 画面 | 11章の画面 | 認証 |
|---|---|---|---|
| `/login` | ログイン（GitHubボタン） | - | 不要 |
| `/` | エントリ。ガードで分岐（下記） | ログイン後初期表示 | 要 |
| `/review` | フラッシュカード復習 | 1 | 要 |
| `/dashboard` | ダッシュボード | 2 | 要 |
| `/attempts/new` | 記録フォーム＋UMPIREパネル（新規） | 3 | 要 |
| `/attempts/:id/edit` | 記録フォーム＋UMPIREパネル（編集） | 3 | 要 |
| `/attempts` | 記録一覧 | 4 | 要 |
| `/attempts/:id` | 記録詳細 | 5 | 要 |

### `/` の初期表示分岐（11章）
ルート `/` は `<EntryRedirect>` を置き、`GET /api/quiz/today` を叩いて判定：
- `alreadyShownToday === false` かつ `cards.length > 0` → `/review` へ遷移（3問後 or クローズで `/dashboard`）。
- それ以外（本日出題済み / ストック0）→ `/dashboard` へ遷移。

> クイズの「本日出題済み」記録はサーバー副作用で確定するため、判定はサーバー(`/api/quiz/today`)に一元化しフロントは結果に従うだけ（別デバイスでも整合 = 5.6）。

### 認証ガード
- `<RequireAuth>` ラッパー：`GET /auth/me` が401なら `/login` へ。全 `/` 配下ルートを包む。
- ログインは `window.location = '/auth/github'`（相対パス。プロキシ経由でLightsailへ転送され、
  OAuthはサーバーリダイレクトで完結する）。

## ディレクトリ構成（feature ベース）

```
frontend/
├── index.html
├── vite.config.ts                    # server.proxy で /api, /auth をローカルExpressへ転送（上記参照）
├── tailwind.config.ts
├── postcss.config.js
├── tsconfig.json
├── .env                              # プロキシ方式のため空（もしくは未使用）。シークレット無し
└── src/
    ├── main.tsx                      # エントリ。RouterProvider
    ├── App.tsx                       # ルート定義（上表）
    ├── index.css                     # Tailwind directives
    │
    ├── routes/                       # 画面（ページ）コンポーネント = 11章の5画面
    │   ├── LoginPage.tsx
    │   ├── EntryRedirect.tsx         # `/` の分岐ロジック
    │   ├── ReviewPage.tsx            # 画面1 フラッシュカード
    │   ├── DashboardPage.tsx         # 画面2 ダッシュボード
    │   ├── AttemptFormPage.tsx       # 画面3 フォーム＋UMPIRE（new/edit兼用）
    │   ├── AttemptListPage.tsx       # 画面4 記録一覧
    │   └── AttemptDetailPage.tsx     # 画面5 記録詳細
    │
    ├── features/                     # 画面をまたぐ機能単位のUI・ロジック
    │   ├── auth/
    │   │   ├── RequireAuth.tsx
    │   │   └── useMe.ts
    │   ├── review/                   # 5.6
    │   │   ├── Flashcard.tsx         # 表(日)→タップで裏(英)返し
    │   │   ├── ReviewDeck.tsx        # 3問進行・クローズボタン
    │   │   └── useQuizToday.ts
    │   ├── dashboard/                # 5.2
    │   │   ├── CoverageChart.tsx     # カテゴリー別網羅率
    │   │   ├── AttemptCountChart.tsx # 総アタック数
    │   │   ├── TrendChart.tsx        # 週次/月次推移
    │   │   └── useDashboard.ts
    │   ├── attempt-form/             # 5.3 / 5.5
    │   │   ├── AttemptForm.tsx       # 左カラム：記録フォーム
    │   │   ├── ProblemAutocomplete.tsx   # 5.1 マスタ絞り込み選択＋自由入力
    │   │   ├── PhraseEditor.tsx      # 英日ペア入力・追加・一覧・削除（5.3）
    │   │   ├── TranscriptInput.tsx   # File API読込 or 手動貼付（5.3）
    │   │   ├── UmpirePanel.tsx       # 右カラム：問題文貼付＋生成結果＋再生成（5.5）
    │   │   ├── AddToPhrasesPopover.tsx  # UMPIRE内テキスト選択→入力欄へ(5.5)
    │   │   └── useAttemptForm.ts
    │   ├── attempt-list/             # 5.8
    │   │   ├── AttemptTable.tsx
    │   │   ├── AttemptFilters.tsx    # カテゴリー・問題名絞り込み
    │   │   └── useAttempts.ts
    │   ├── attempt-detail/           # 5.8
    │   │   ├── YouTubeEmbed.tsx      # iframe埋め込み
    │   │   ├── TranscriptView.tsx    # 折りたたみ表示
    │   │   ├── PhraseList.tsx
    │   │   └── useAttemptDetail.ts
    │   └── github/                   # 5.4
    │       ├── PushButton.tsx
    │       └── OverwriteWarningDialog.tsx  # 上書き警告→force続行
    │
    ├── components/                   # 汎用UI（features非依存）
    │   ├── ui/                       # Button, Dialog, Input, Textarea, Select, Spinner...
    │   ├── Layout.tsx                # ナビ/ヘッダ（レスポンシブ）
    │   └── ErrorBoundary.tsx
    │
    ├── api/                          # バックエンド通信層（02-api-design.md と1:1）
    │   ├── client.ts                 # fetchラッパー（credentials:'include', baseURLは空文字＝相対パス）
    │   ├── auth.ts                    # /auth/me, logout
    │   ├── categories.ts
    │   ├── problems.ts
    │   ├── dashboard.ts
    │   ├── attempts.ts
    │   ├── translate.ts               # POST /api/translate
    │   ├── umpire.ts                  # POST /api/problems/:id/umpire, /api/umpire/preview
    │   ├── github.ts                  # /api/github/check, /push
    │   └── quiz.ts                    # /api/quiz/today
    │
    ├── types/                        # APIのDTO型（02-api-design.md からミラー。バックエンドとshared化推奨）
    │   └── api.ts
    │
    ├── hooks/                        # 汎用フック
    │   └── useFileText.ts            # <input type=file> をFile APIでテキスト読込（5.3文字起こし）
    │
    └── lib/
        ├── youtube.ts                # URL → 埋め込みID変換
        └── format.ts                 # 日付・週/月ラベル整形
```

## 画面ごとの要件対応メモ
- **画面3（AttemptFormPage）**：11章のレイアウト要件どおり、Tailwind の `lg:grid-cols-2` で PC=左フォーム/右UMPIRE、`grid-cols-1` でスマホ縦積み。問題タイトル入力→UMPIREパネル問題文欄1行目へ自動反映（5.5）は `AttemptForm` と `UmpirePanel` を親 `useAttemptForm.ts` の状態で連携。
- **UMPIRE再生成**：既存キャッシュ表示中は「再生成」ボタンのみ `force:true` で叩く（5.5・コスト削減）。
- **Add to phrases（5.5）**：`UmpirePanel` 内の選択テキストを `AddToPhrasesPopover` 経由で `PhraseEditor` の英語入力欄へセット→Haikuサジェスト（`translate.ts`）へ。
- **文字起こし（5.3）**：`useFileText` はブラウザ内File APIのみ（サーバーへアップロードしない）。バックエンドのホスト先に非依存。
- **YouTube埋め込み（5.8）**：`YouTubeEmbed` は公開/限定公開前提。非公開は再生不可の注意表示。

## 状態管理・データ取得の方針（提案）
- サーバー状態：TanStack Query（`useQuery`/`useMutation`）を推奨。キャッシュ・再取得・ローディング制御が5.5のキャッシュ表示や一覧絞り込みと相性が良い。→ 採用可否は 要確認 Q11。
- ローカルフォーム状態：React Hook Form + Zod（型はDTOと共有）を推奨。→ 要確認 Q11。
- 型の重複回避：`types/api.ts` はバックエンドとの共有パッケージ化（monorepo or shared dir）を推奨。→ 要確認 Q12。
