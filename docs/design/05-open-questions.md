# 要確認事項（要件定義 v1.0 に記載がなく、実装前に決定が必要な点）

勝手に決めず、以下は判断を仰ぐ。各項目に「暫定案（このまま進める場合の既定）」を併記。

| # | 論点 | 背景（要件の該当箇所） | 暫定案 |
|---|---|---|---|
| ~~Q1~~ | ~~CORS/クッキー設定~~ | **解決済み（2026-07-04決定）**：ドメインは購入せず、Amplify Hostingのリライト機能で`/api/<*>``/auth/<*>`をLightsailへプロキシする方式を採用。ブラウザは常に同一オリジン扱いになるためCORS設定・`SameSite=None`が不要になり、`SameSite=Lax; Secure`で運用する。詳細は`docs/infra-setup.md`0章・7.2章、`docs/design/02-api-design.md`参照 | （解決済みのため暫定案なし） |
| Q2 | 「総アタック数」にマスタ外を含めるか | 5.2は総アタック数=「複数回挑戦を含む記録総件数」。網羅率の分子はマスタ紐付きのみと明記されるが、総アタック数の分母範囲が曖昧 | マスタ紐付きAttemptのみ集計（網羅率と母集団を揃える）。マスタ外を別枠表示する案もあり |
| Q3 | Anthropic モデルIDの確定 | 5.5「Sonnet系」5.3「Haiku系」と系のみ指定。具体モデルID・トークン上限・タイムアウトが未定（8章） | 実行時点の最新安定版（Sonnet系/Haiku系）を環境変数 `ANTHROPIC_MODEL_UMPIRE` / `ANTHROPIC_MODEL_TRANSLATE` で外出し |
| Q4 | `umpire_generated_at` 列の追加可否 | 7章のProblemに無い列を追加提案（キャッシュ運用・再生成監査用） | 追加する（NULL許容で既存要件に影響なし）。不要なら削除 |
| Q5 | `attempts.github_path` 列の追加可否 | 5.4の上書き防止・「アプリ作成ファイルはアプリからのみ更新」を確実にするため、push済みパスを保持する列を提案（7章に無い） | 追加する。不要なら `github_pushed` フラグのみで運用 |
| Q6 | Attempt / Phrase の削除機能 | 5.8は閲覧・編集は明記だが**削除**の要否が未定義。DELETEエンドポイントとcascadeを暫定設計済み | 削除機能は提供（ミス投入の訂正用）。UIから隠す運用も可 |
| Q7 | 既存(Obsidian)ファイルへのpush扱い | 5.4「既存ファイルはアプリから触らない」。`force:true` でも既存ファイル(createdByApp=false)へのpushを許可するか | 許可しない（force無視して拒否）。安全側に倒す |
| ~~Q8~~ | ~~GitHub push 用トークンの取得元~~ | **解決済み（2026-07-04決定）**：Fine-grained PAT（対象リポジトリ`leetcode-interview-prep`のみ、`Contents: Read and write`権限のみ）を発行し、`.env`の`GITHUB_PUSH_TOKEN`として保持する。ログイン用のGitHub OAuth（認証専用）とは別トークンとし、OAuth側に`repo`スコープは付与しない（スコープを認証専用に保てる／DBへのトークン永続化が不要／対象リポジトリを1つに限定できる、という理由でOAuthトークン再利用より単純かつ安全）。有効期限は最大1年（GitHub側で延長は再発行が必要。期限前にGitHubから通知メールが届く） | （解決済みのため暫定案なし） |
| Q9 | `/api/quiz/today` の副作用設計 | 5.6「最初に開いたタイミングで出題」を GET の副作用(QuizLog INSERT)で実現。GETに副作用を持たせる是非、複数タブ同時起動の扱い | GETで抽選＆記録（UNIQUEでレース防止）。厳密にしたい場合は `POST /api/quiz/draw` に分離 |
| Q10 | インポートの冪等キー | 5.7は一回限りだが、再実行時の重複防止キー（例：category+number+attemptNumber の一意性）が未定義 | (categoryId, number, attemptNumber) を論理キーに重複スキップ。マスタ外はcustomTitleで代替 |
| Q11 | フロント状態管理ライブラリ | 8章はReact+Vite+TS+Tailwindのみ指定。データ取得(TanStack Query)・フォーム(RHF+Zod)は提案 | TanStack Query + React Hook Form + Zod を採用 |
| Q12 | 型定義の共有方法 | フロント/バックエンドでDTO型が重複。monorepo化 or shared パッケージ化の是非 | まずは各ディレクトリにミラー。将来 pnpm の workspace 機能で `packages/shared` 化（パッケージマネージャ自体は pnpm に決定済み → `CLAUDE.md`参照。frontend/backendはそれぞれ独立した`pnpm-lock.yaml`を持つ単純な同居構成とし、現時点ではworkspace化はしない） |
| Q13 | リポジトリ配置（front/back同居 or 分割） | 8章はフロント=Amplify・バックエンド=Lightsailと別ホスティング。単一リポジトリのmonorepoか別リポジトリか未定 | monorepo（`frontend/` `backend/`）。Amplifyはサブディレクトリビルド指定。両ディレクトリはそれぞれ独立したpnpmプロジェクト（各自`pnpm-lock.yaml`を持つ）とし、pnpm workspace機能は現時点では使わない（Q12参照） |
| Q14 | フラッシュカードの英語音声読み上げ | 5.6は日→英の裏返し表示のみ。発音確認のためのTTS要否は未言及（スピーキング準備アプリの文脈） | MVPではスコープ外（フェーズ2候補） |
| Q15 | 記録フォームでの問題文タイトル自動反映の保存 | 5.5でproblem_titleを問題文欄1行目へ自動挿入。この合成後テキストをそのまま `problem_statement` に保存するか、タイトル行を除去して保存するか | 合成後テキストをそのまま `problem_statement` に保存（UMPIRE入力の再現性重視） |
| Q16 | GitHubへpushするMarkdownの本文フォーマット | 5.4はファイル名規則は確定だが、ファイル**中身**の構成（コード/フレーズ/UMPIREをどう並べるか）が未定義 | code＋UMPIRE＋フレーズを見出し付きで結合するテンプレートを別途定義予定。要フォーマット確定 |

## 特に早期確定が望ましいもの
- ~~Q1（CORS/クッキー/ドメイン）：解決済み（プロキシ方式採用、上表参照）~~
- **Q3（モデルID）**：5.3/5.5の中核。コスト試算にも影響。
- ~~Q8（pushトークン）：解決済み（Fine-grained PAT採用、上表参照）~~
- **Q16（Markdown本文フォーマット）**：5.4 push の成果物品質に直結。
