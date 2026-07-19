# CI/CD設計（GitHub Actions + Amplify Hosting + Lightsail）

`docs/infra-setup.md` で構築したインフラに対する、継続的デプロイの設計です。
関連ワークフロー：`.github/workflows/deploy-backend-lightsail.yml`, `frontend-ci.yml`, `amplify-manual-deploy.yml`

---

## 1. 全体方針

フロントエンド（Amplify Hosting）とバックエンド（Lightsail）でデプロイ方式を分けています。

| 対象 | デプロイ方式 | トリガー |
|---|---|---|
| フロントエンド（React SPA） | **AWS Amplify Hosting のGitHub連携によるネイティブ自動デプロイ** | `main`へのpush（Amplify側で検知） |
| フロントエンド（PR時） | GitHub Actions（`frontend-ci.yml`）でビルド・lint・testのみ検証 | PR作成・更新時 |
| バックエンド（Express + SQLite） | GitHub Actions（`deploy-backend-lightsail.yml`）でビルド→SSH経由でLightsailへ配置・pm2リロード | `main`へのpush（`backend/**`変更時） |
| フロントエンド（手動再デプロイ） | GitHub Actions（`amplify-manual-deploy.yml`）で`aws amplify start-job`を手動実行 | `workflow_dispatch`（人間が明示的に実行） |

**なぜフロントエンドはGitHub Actionsでデプロイしないのか**：
Amplify Hostingは元々「GitHubリポジトリと直接連携してpush検知→自動ビルド→デプロイ」を無料枠内でサポートしています。
GitHub Actions経由で`aws amplify start-job`を都度叩く構成も可能ですが、二重の仕組みを持つと
「Amplify側のWebhookと手動start-jobが競合する」「どちらが最新をデプロイしたか分かりにくい」といった問題が起きやすいため、
通常pushによるデプロイはAmplifyのネイティブ機能に一本化し、GitHub Actions側は「コード変更を伴わない再デプロイ」用の
補助的な手動トリガーにとどめています。

---

## 2. バックエンドデプロイフロー詳細（`deploy-backend-lightsail.yml`）

```
push to main (backend/**)
   │
   ▼
[GitHub Actions runner]
  1. checkout
  2. pnpm/action-setup → pnpm install --frozen-lockfile / pnpm run build (backend/)
  3. pnpm run test --if-present
  4. SSH鍵をセットアップ（GitHub Secretsから）
  5. サーバーに /opt/app/releases/<sha>/ ディレクトリを作成
  6. rsyncでdist/・package.json・pnpm-lock.yamlを転送
  7. deploy-backend.sh・ecosystem.config.js.templateを転送
  8. SSH経由でリモートのdeploy-backend.shを実行
       - pnpm install --prod --frozen-lockfile
       - .envを共有パスからシンボリックリンク
       - current シンボリックリンクを新リリースに切り替え
       - pm2 reload（ゼロダウンタイムに近い形で切り替え）
       - 古いリリースを5世代より前は削除
  9. /health エンドポイントにcurlしてヘルスチェック
```

> パッケージマネージャは **pnpm** を採用（npm/yarnは使わない）。サーバー上ではNode.js同梱のCorepack経由で
> 有効化する（`infra/scripts/bootstrap.sh`参照）。詳細は `CLAUDE.md` 参照。

### DBマイグレーションの反映（自動デプロイの対象外・手動SSH運用）

**このワークフローはDBマイグレーションを実行しません。** マイグレーションの本番反映は
**手動SSHで `drizzle-kit push` を打つ運用**です（2026-07-05決定。個人開発・単一運用者で
スキーマ変更頻度も低いため、rsync対象に `drizzle/` を追加して `deploy-backend.sh` で
自動実行する仕組みを整備するコストに見合わないと判断）。

**スキーマ変更を含むリリースでは、必ず以下の順序を守ること：**

1. **先に** `drizzle-kit push` を実行してDBスキーマを更新する
2. **その後に** アプリをデプロイ（＝pm2 reload）する

順序を誤ると、新しいコードが旧スキーマに対して動く（またはその逆）状態が発生し、実行時エラーや
データ不整合の原因になります。手動運用における唯一かつ最大のリスクがこの順序ミスです。

```bash
# 1) 先にマイグレーションを本番DBへ反映
ssh -i ~/.ssh/lightsail_interview_prep ubuntu@<static-ip>
cd /opt/app/current
pnpm exec drizzle-kit push      # DB_PATH は /opt/app/shared/.env から読まれる
exit

# 2) その後に main へ push（＝このワークフローが走り pm2 reload される）
git push origin main
```

スキーマ変更を含まないリリース（アプリコードのみの変更）では手順1は不要で、`main` への push だけでよい。

### ロールバック方針
`/opt/app/releases/`には直近5世代が保持されるため、障害時は手動SSHで以下のようにロールバック可能です：

```bash
ssh -i ~/.ssh/lightsail_interview_prep ubuntu@<static-ip>
ls -1t /opt/app/releases/    # 直近のリリース一覧（新しい順）
ln -sfn /opt/app/releases/<戻したいsha> /opt/app/current
pm2 reload interview-prep-api --update-env
```

将来的には`workflow_dispatch`で「指定SHAへロールバック」するワークフローを追加してもよい（未実装・要検討）。

### 必要なGitHub Secrets

| Secret名 | 内容 |
|---|---|
| `LIGHTSAIL_HOST` | Lightsailの静的IP（`terraform output lightsail_static_ip`） |
| `LIGHTSAIL_SSH_USER` | `ubuntu` |
| `LIGHTSAIL_SSH_PRIVATE_KEY` | `~/.ssh/lightsail_interview_prep`の秘密鍵の中身（PEM全文） |

`ANTHROPIC_API_KEY`等のアプリ用シークレットはGitHub Secretsには保存しません。
サーバー上の`/opt/app/shared/.env`にのみ存在し、CIのデプロイでは一切上書きされません
（`.env`をGit管理下にもGitHub Actionsのログにも一切出さない設計）。

---

## 3. フロントエンドCI（`frontend-ci.yml`）

PRごとにビルド・lint・型チェック・testを実行し、Amplifyが実際にビルドする前に壊れていないかを検知します。
本デプロイは行わないため、AWS認証情報は一切不要です。

---

## 4. フロントエンド手動再デプロイ（`amplify-manual-deploy.yml`）

Amplifyコンソール側で環境変数を変更した場合など、コード変更を伴わずに再ビルドしたいときに使う`workflow_dispatch`専用ワークフローです。

### 必要なGitHub Secrets

| Secret名 | 内容 |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | `amplify:StartJob`のみを許可する最小権限IAMユーザーの認証情報 |
| `AMPLIFY_APP_ID` | AmplifyアプリのID |

**要検討事項**：長期アクセスキーの代わりに、GitHub ActionsのOIDC機能でIAMロールを一時的に引き受ける方式
（`aws-actions/configure-aws-credentials`の`role-to-assume`パラメータ）に切り替えるとより安全です。
個人開発・低頻度利用のため今回はシンプルなアクセスキー方式をデフォルトとしていますが、
IAM OIDC Identity Providerの設定が許容できるなら移行を推奨します（Terraformコード未実装）。

---

## 5. デプロイ時のシークレット管理まとめ

| シークレット | 保存場所 | CI/CDでの扱い |
|---|---|---|
| `ANTHROPIC_API_KEY` 等アプリ用.env変数 | Lightsailサーバー上の`/opt/app/shared/.env`のみ | CIからは一切触らない（コードのみデプロイ） |
| `LIGHTSAIL_SSH_PRIVATE_KEY` | GitHub Actions Secrets | バックエンドデプロイ時のSSH接続にのみ使用 |
| `AWS_ACCESS_KEY_ID`/`SECRET`（Amplify用） | GitHub Actions Secrets | 手動再デプロイワークフローでのみ使用 |

---

## 6. 未確定・要判断事項

- バックエンドのリポジトリ内パス（`backend/`と仮定）・エントリポイント（`dist/index.js`と仮定）・
  ヘルスチェックエンドポイント（`/health`と仮定）は、design-planner/implementer側の実装確定後に
  `deploy-backend-lightsail.yml` と `infra/pm2/ecosystem.config.js.template` を合わせて調整する必要があります。
- GitHub OAuthのコールバックURLは、**Amplifyのドメイン配下**（プロキシ方式。`docs/infra-setup.md` 7.2/8章参照）で
  Express側の認証ルート実装が確定してから確定させる必要があります。
- Amplify Hostingのビルド設定（`appRoot`, `baseDirectory`）もフロントエンドのディレクトリ構成確定後に調整してください。
- Amplifyの「リライトとリダイレクト」設定（`/api/<*>` `/auth/<*>` → Lightsail、SPAフォールバック）は
  コンソール上の設定のためコード化されていません。Lightsailの静的IPが変わった場合（インスタンス再作成等。
  通常は`aws_lightsail_static_ip`があるため変わらない想定）は手動で更新が必要です。
