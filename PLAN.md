# PLAN.md

このファイルは「今どこまで進んでいて、次に何をやるか」を記録する生きたTODOです。
決めた理由・仕様そのものは `CLAUDE.md` / `docs/requirements.md` / `docs/design/` を正とし、
ここには**まだ会話にしか残っていない一時的な情報**（未修正のバグ、次の作業順）を置く。
完了した項目はチェックし、古くなったら削除してよい（このファイル自体は不揮発だが内容は使い捨て）。

## 現在のフェーズ

設計フェーズはほぼ完了（DB/API/フロント構成、インフラ手順、CI/CD設計、シードデータまで作成済み）。
実装フェーズ。バックエンド雛形、DB層（Drizzle ORM + SQLite、初期マイグレーション、7カテゴリー59問のシード）、
GitHub OAuth認証（単一ユーザー制限、SQLiteセッション）まで完了。
Attempt CRUD API（一覧・詳細・作成・編集・削除、Phrase差分更新、自動採番）まで実装済み。
ダッシュボードAPI（カテゴリー別網羅率・総アタック数、週次/月次推移）まで実装済み。
カテゴリー／問題マスタAPI（有効カテゴリー一覧、問題一覧・絞り込み・詳細）まで実装済み。
フロントエンド雛形（React/Vite/Tailwind、認証ガード、共通レイアウト、MVP画面ルート）まで実装済み。
ダッシュボード画面（実データ接続、網羅率・アタック数・週次/月次推移）まで実装済み。
記録一覧画面（実データ接続、カテゴリー・問題絞り込み、レスポンシブ表示）まで実装済み。
記録詳細画面（コード・動画・UMPIRE・文字起こし・フレーズ・振り返り表示）まで実装済み。
記録フォーム基本機能（新規・編集、マスタ/自由入力、Phrase差分、.txt読み込み）まで実装済み。
AI連携API（翻訳サジェスト `POST /api/translate` = Haiku、UMPIRE生成 `POST /api/problems/:id/umpire`・
`POST /api/umpire/preview` = Sonnet、キャッシュ再利用込み）のバックエンドまで実装・PR済み。
残作業は「残タスク一覧」参照。

## 決定ログ（日付順）

- 2026-07-04：フロント⇔バックエンド接続は**プロキシ方式**を採用（カスタムドメインは購入しない）。
  Amplify Hostingのリライトで `/api/<*>` `/auth/<*>` をLightsailへ転送。詳細→`docs/infra-setup.md` 0章・7章
- 2026-07-04：パッケージマネージャは**pnpm**に統一（npm/yarn不使用）。詳細→`CLAUDE.md`
- 2026-07-04：GitHub push用トークンは**Fine-grained PAT**（対象リポジトリ1つ・Contents読み書きのみ）。
  ログイン用OAuthとは分離。詳細→`docs/design/05-open-questions.md` Q8
- 2026-07-04：GitHub pushするMarkdown本文フォーマット確定（**Q16解決**）。既存Obsidianファイル
  （`problems/linked-list/21. Merge Two Sorted Lists.md`）を見せてもらい判断。旧テンプレートの
  U/M/P（Summary/Pattern/Approach）とフロントマターの`pattern`/`difficulty`/`mastery`は実際ほとんど
  書かれておらず現行DBにも存在しないフィールドだったため**廃止**。フロントマター自体も
  「GitHub側だけのメタデータ」を持つと将来のスキーマ変更のたびに追従させる二重管理コストが
  発生するため**全廃**し、日付・挑戦回数は見出し行にプレーンテキストで含める方式に統一。
  UMPIRE解説はProblemマスタ側で管理・アプリ内参照が主目的のためpush本文には含めない。
  代わりに旧「Could Not Say」チェックリストの役割を、`attempts.retrospective`
  （できなかったこと・つまずいた点の自由記述、新設カラム）で簡略化して引き継ぐ。
  最終テンプレート・DTO変更点は`docs/requirements.md` 5.3/5.4、`docs/design/01-db-schema.md`、
  `docs/design/02-api-design.md`（GitHub push節）に反映済み
- 2026-07-04：**Q2〜Q7・Q9〜Q15を暫定案どおり採用で一括確定**（これでQ1〜Q16全件解決）。
  各決定内容は`docs/design/05-open-questions.md`の表に反映済み。Q3のモデルIDは環境変数外出し
  （`ANTHROPIC_MODEL_UMPIRE`=claude-sonnet-5 / `ANTHROPIC_MODEL_TRANSLATE`=claude-haiku-4-5-20251001 を初期値）
- 2026-07-04：**Node.jsは24系で統一**（ローカルに24.5が入っているのに合わせ、CI・Lightsail・Amplifyビルドも24へ。
  Node 20は2026-04でEOL済みだったため）。**pnpmのバージョンの正は各package.jsonの`packageManager`フィールドのみ**
  とし、CIの`version: 9`直書き・bootstrap.shの`corepack prepare pnpm@latest`を廃止。詳細→`CLAUDE.md`
- 2026-07-04：bootstrap.shから**certbot / python3-certbot-nginx を削除**（プロキシ方式でTLS終端は
  Amplify/CloudFront側のため、Lightsail上に証明書は不要）。CIの`--if-present`フラグ位置バグも修正済み
- 2026-07-04：**DB本体の定期バックアップ機構をいったん全削除**（個人開発・単一運用者のため）。
  `infra/terraform/backup.tf`（S3バケット・バックアップ用IAMユーザー）、
  `infra/scripts/{backup-sqlite-to-s3,setup-backup-cron,restore-sqlite-from-s3}.sh`を削除し、
  `outputs.tf`/`variables.tf`/`terraform.tfvars.example`/`bootstrap.sh`（AWS CLI導入含む）/
  `docs/infra-setup.md`（0・3・4・5・6・11(旧)・12・13章）/`docs/deployment-cicd.md`から関連記述を除去。
  **注意**：`docs/requirements.md` 8章には「永続ディスク上にDBファイルを置き、定期バックアップ
  （S3へのスナップショット等）を設定」という記述がまだ残っている（唯一の正となる仕様のため今回は
  文言を変更していない）。実装が進んでバックアップを本当に不要と判断するなら、要件定義書側の
  文言修正も検討すること。必要になったら`aws-infra`サブエージェントで再構築する
- 2026-07-05：**DBマイグレーションの本番反映方式は(b)手動SSHで`drizzle-kit push`を打つ運用に決定**。
  個人開発・単一運用者でスキーマ変更頻度も低いため、rsync対象に`drizzle/`を追加して
  `deploy-backend.sh`で自動実行する仕組み（候補a）を整備するコストに見合わないと判断。
  ただし手動運用の唯一のリスクは実行順序を誤ること（新コードが旧スキーマに対して動く、またはその逆）
  なので、デプロイ手順には**「`drizzle-kit push`を先に実行 → その後pm2再起動」の順序を必ず守ること**を
  明記する（`docs/infra-setup.md`または`docs/deployment-cicd.md`のデプロイ手順に追記予定）
- 2026-07-12：**残りのMVP実装を9ブランチに分割し、順番に実装していく運用に決定**（下記「残タスク一覧」）。
  各ブランチは `implementer → code-reviewer → 人間確認 → commit/push/PR` のフローで進める。
  **push・PR作成は毎回人間に内容を提示して確認**を取る運用（まとめて許可はしない）。
  マージ方式は**A案（各PRをmainにマージしてから次ブランチをmainから分岐）**を採用（履歴を素直に保つため）。
  PR作成は `gh` CLIで行う（`gh auth login` 済み・アカウント asab0o）。
- 2026-07-12：#1 `feature/ai-translate-api`（翻訳サジェストAPI）実装・レビュー(Approve)・**PR #14 マージ済み**。
  #2 `feature/ai-umpire-api`（UMPIRE生成API）実装・レビュー(Approve)・**PR #15 作成済み（未マージ）**。
  Anthropic基盤は #1 で構築（`config.ts` の `loadAnthropicConfig` はキー未設定なら null を返し、
  `ANTHROPIC_API_KEY` 未設定でもサーバー全体は起動継続。翻訳/UMPIRE呼び出し時のみ 503）。
  UMPIREは `max_tokens=8192`＋`stop_reason=max_tokens` 検知で不完全な解説をキャッシュ保存させない対応済み。

## 残タスク一覧（MVP残り。2026-07-12時点。A案・毎回確認で順次実装）

| # | ブランチ | 内容 | 状態 |
|---|---|---|---|
| 1 | `feature/ai-translate-api` | 翻訳サジェストAPI（Haiku） | ✅ PR #14 マージ済み |
| 2 | `feature/ai-umpire-api` | UMPIRE生成API（Sonnet、生成/取得＋preview） | ✅ PR #15（未マージ） |
| 3 | `feature/attempt-form-ai-ui` | フロント：翻訳サジェスト＋UMPIRE解説パネル（生成/再生成・タイトル自動反映・Add to phrases） | 次 |
| 4 | `feature/github-push-api` | GitHub push API（check/push、Markdownテンプレ、kebab-caseパス、CATEGORY_REQUIRED、pushedフラグ） | 未 |
| 5 | `feature/github-push-ui` | フロント：Pushボタン＋上書き警告ダイアログ | 未 |
| 6 | `feature/quiz-api` | フラッシュカードAPI（`GET /api/quiz/today`、JST 1日1回・ランダム3問・QuizLog） | 未 |
| 7 | `feature/quiz-ui` | フロント：復習画面＋ログイン後の初期表示分岐 | 未 |
| 8 | `feature/import-script` | 過去データインポート（`problems/`配下Markdown→Attempt、開発時一回限り） | 未 |
| 9 | `docs/deploy-migration-order` | ドキュメント：デプロイ手順に `drizzle-kit push`→pm2再起動 順序を明記（下記デプロイ節と重複、ここで消化） | 未 |

**動作確認の前提**：#3以降のAI連携UIは実キー（`ANTHROPIC_API_KEY`）、#4-5のGitHub pushは `GITHUB_PUSH_TOKEN`
が `.env` に必要。コード実装は鍵なしでも進むが、実疎通確認は人間が鍵を入れてから。

## 未対応の指摘事項（実装開始前に直すべき）

初回レビューで見つかったが、まだファイル修正が済んでいないもの。

- [x] **pm2の`env_file`は存在しないオプション** → 2026-07-04修正済み。`ecosystem.config.js.template`から
  `env_file`を削除。.envの読み込みはExpress側の`dotenv`が起動時にcwd（=リリースディレクトリ、
  `.env`がシンボリックリンクされる）から読む方式に変更。implementer実装時に`dotenv`導入を忘れないこと
- [x] ~~バックアップcronがログ権限で失敗する~~ → 2026-07-04、DB本体のバックアップ機構ごと削除したため対象消滅（決定ログ参照）
- [x] **express-sessionのセッションストアが未指定** → 2026-07-04修正済み。`better-sqlite3-session-store`
  を採用し、`01-db-schema.md`のDBコネクション（`app.db`）と共有する方式を`02-api-design.md`に明記
- [x] **PUT /api/attempts/:id のphrases全置換方式の再検討** → 2026-07-04修正済み。`id`の有無で
  更新/新規/削除を判定する差分方式に変更（`docs/design/02-api-design.md`）。PhraseInputに`id?: number`を追加
- [x] **マスタ外問題でcategory_id未指定時のGitHub pushバリデーション** → 2026-07-04修正済み。
  push時にcategoryIdが解決できない場合は400（`CATEGORY_REQUIRED`）を返す仕様を`02-api-design.md`に明記。
  DBスキーマ側の`attempts.categoryId`はNULL許容のまま（push機能を使わないAttemptまで必須にしないため）
- [x] `.env.example`の`PORT`が「参考」コメント止まりで正式な変数になっていない → 2026-07-04修正済み。
  `PORT=3000`/`NODE_ENV=production`を正式な変数として追加
- [x] **`.env.example`に`ANTHROPIC_MODEL_UMPIRE`/`ANTHROPIC_MODEL_TRANSLATE`が未追記**。
  Q3確定（モデルIDは環境変数で外出し）に伴い必要。初期値は`claude-sonnet-5`（UMPIRE解説）/
  `claude-haiku-4-5-20251001`（フレーズ翻訳）→ 2026-07-04追記済み
- [ ] **implementerがfrontend/backendのpackage.jsonを作る際、`packageManager`フィールドを必ず設定する**
  （例：`"packageManager": "pnpm@<その時点の最新安定版>"`）。CIの`pnpm/action-setup`はこのフィールドを
  参照する設定に変更済みのため、無いとCIが落ちる。`CLAUDE.md`参照

## 残る未決定事項

`docs/design/05-open-questions.md`のQ1〜Q16はすべて解決済み。DBマイグレーションの本番反映方式も
2026-07-05決定済み（決定ログ参照）。現時点で新たな保留中の論点はなし。

## 次にやること（実装順の想定）

「未対応の指摘事項」は`packageManager`フィールドの設定漏れ注意（実装時に思い出す用のリマインダー）を
除きすべて対応済み（2026-07-04）。バックエンド雛形（Express+TypeScript、`/health`のみ）は実装・レビュー・
PR #3のmainへのマージまで完了。DB層も2026-07-12に実装済み。

AI連携APIのバックエンド（#1翻訳・#2 UMPIRE）は実装完了。以降は上記「残タスク一覧」を#3から順に消化する。

1. **#3 `feature/attempt-form-ai-ui`**（次）：フロントのAI連携UI。#2（PR #15）をmainにマージしてから main から分岐
2. 続けて #4→#5（GitHub push API/UI）、#6→#7（フラッシュカードAPI/UI）、#8（インポート）、#9（デプロイ手順ドキュメント）
3. 各機能実装直後にcode-reviewerでレビュー → 人間確認 → commit/push/PR（A案・毎回確認）
   （package.jsonの`packageManager`フィールド設定を忘れないこと）
4. 並行して人間側のインフラ構築（`docs/infra-setup.md`：AWSアカウント→Terraform apply→OAuth App登録→PAT発行）
   と `.env` への実キー投入（AI連携・GitHub pushの実疎通確認に必要）
