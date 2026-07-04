# CLAUDE.md

海外就活（技術面接）準備を1つのWebアプリに統合するための個人開発プロジェクト。単一ユーザー想定。
詳細要件は [docs/requirements.md](docs/requirements.md) 参照。

## パッケージマネージャ：pnpm（必須）

**npm・yarnは使わない。** `frontend/` `backend/` のどちらでも常に `pnpm` コマンドを使うこと。

- インストール：`pnpm install`（`npm install` ではない）
- 依存追加：`pnpm add <pkg>` / `pnpm add -D <pkg>`
- スクリプト実行：`pnpm run <script>`
- 一度きりのバイナリ実行（`npx`相当）：`pnpm exec <bin>`（プロジェクトの devDependency を使う場合）
- ロックファイルは `pnpm-lock.yaml`。`package-lock.json` / `yarn.lock` を生成・コミットしない
- **pnpmのバージョンの正は各 `package.json` の `packageManager` フィールドのみ**（例：`"packageManager": "pnpm@10.x.x"`。
  implementerがpackage.json作成時に必ず設定すること）。CI・Lightsail・Amplifyはすべてこのフィールドから自動解決する：
  - CI（GitHub Actions）：`pnpm/action-setup` に `version` を直書きせず `package_json_file` で参照させる
  - Lightsail / Amplify：Corepack経由で有効化（`corepack enable`のみ。`corepack prepare pnpm@latest`のような別経路のバージョン指定はしない）
- CI（GitHub Actions）では `pnpm/action-setup` を必ず `actions/setup-node` より前に置く
- **Node.jsは24系で統一**（ローカル・CI・Lightsail・Amplifyビルドすべて。2026-07-04決定）

`frontend/` と `backend/` は現時点では **pnpm workspace化していない**。それぞれ独立したpnpmプロジェクトとして
別々の `pnpm-lock.yaml` を持つ、単純な同居構成（monorepoではあるがworkspaceではない）。
理由・将来のworkspace化の可能性は [docs/design/05-open-questions.md](docs/design/05-open-questions.md) のQ12/Q13参照。

## 決定済みの主要アーキテクチャ

- **ホスティング**：フロント＝AWS Amplify Hosting（React SPA静的配信）、バックエンド＋DB＝AWS Lightsail小型インスタンス（Express + SQLite同居）
- **フロント⇔バックエンドの接続はプロキシ方式**：カスタムドメインは購入せず、Amplify Hostingの
  リライト機能で `/api/<*>` `/auth/<*>` をLightsailへ転送する。ブラウザは常にAmplifyのドメインとしか
  通信しないため、CORS設定・`SameSite=None`・証明書運用が一切不要（詳細：[docs/infra-setup.md](docs/infra-setup.md) 0章・7章）
- **認証**：GitHub OAuth。`GITHUB_ALLOWED_USERNAME` と一致するアカウントのみログイン可（単一ユーザー制限、要件定義13章）
- **APIキー管理**：Anthropic API・GitHub OAuthシークレット等は全てExpress側の環境変数のみで保持し、フロントエンドには一切埋め込まない
- **DB**：SQLite（Drizzle ORM）。単一ユーザー・低トラフィック前提。将来PostgreSQL移行の可能性あり

## ドキュメント構成

| ファイル | 内容 |
|---|---|
| [docs/requirements.md](docs/requirements.md) | 要件定義書（唯一の正となる仕様） |
| [docs/design/01-db-schema.md](docs/design/01-db-schema.md) | DBスキーマ（Drizzle ORM） |
| [docs/design/02-api-design.md](docs/design/02-api-design.md) | REST API設計 |
| [docs/design/03-frontend-structure.md](docs/design/03-frontend-structure.md) | フロントエンド構成 |
| [docs/design/04-seed.md](docs/design/04-seed.md) | 初期シードデータ |
| [docs/design/05-open-questions.md](docs/design/05-open-questions.md) | 未決事項と暫定案（実装前に要確認） |
| [docs/infra-setup.md](docs/infra-setup.md) | インフラ構築手順（人間が実行） |
| [docs/deployment-cicd.md](docs/deployment-cicd.md) | CI/CD設計 |

## サブエージェント

`.claude/agents/` に定義済み。実装フローは以下の順で使うこと：

1. **design-planner**：要件定義を元にDB/API/ディレクトリ構成を設計（実装前に必須）
2. **implementer**：設計を元に1機能単位でコードを実装
3. **code-reviewer**：実装直後に必ずレビュー（要件整合性・セキュリティ・型安全性）
4. **aws-infra**：インフラ構築手順書・IaCコードの作成（実際のAWS操作は人間が行う）

## GitHub push用トークン

ログイン用のGitHub OAuthとは別に、Fine-grained PAT（対象リポジトリ`leetcode-interview-prep`のみ、
`Contents: Read and write`権限のみ）を発行し、`GITHUB_PUSH_TOKEN`として環境変数に保持する
（ログイン用OAuthのスコープに`repo`は含めない）。理由・詳細は [docs/design/05-open-questions.md](docs/design/05-open-questions.md) Q8参照。

## 未確定事項

[docs/design/05-open-questions.md](docs/design/05-open-questions.md) のQ1〜Q16は**すべて解決済み**（2026-07-04）。
決定内容は同ファイルの表を参照。新たな未決事項が出た場合は同ファイルに追記して判断を仰ぐこと。
残る保留事項（DBマイグレーションの本番反映方式など）は [PLAN.md](PLAN.md) の「残る未決定事項」参照。
