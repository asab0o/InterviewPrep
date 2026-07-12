# インフラ構築手順書（Amplify Hosting + Lightsail + SQLite）

本ドキュメントは `docs/requirements.md` 8章（技術スタック）・12章（事前準備リスト）・13章（認証の補足）に基づく、
実際にAWS上でインフラを構築するための手順書です。AWSアカウント作成・実際のプロビジョニング実行は人間が行う必要があるため、
以下は「人間が実行するコマンド付き手順」として記載しています。

方針（要件定義書8章）：クレジット枯渇後も低コストで維持できる軽量構成。RDSやApp Runner等の高コスト構成は使いません。

関連ファイル：
- Terraformコード：`infra/terraform/`
- セットアップスクリプト：`infra/scripts/`
- nginx/pm2設定テンプレート：`infra/nginx/`, `infra/pm2/`
- CI/CD設計の詳細：`docs/deployment-cicd.md`
- 環境変数テンプレート：`.env.example`

---

## 0. 全体アーキテクチャ（プロキシ方式：ドメイン・証明書は使わない）

```
[ブラウザ]
   │  HTTPS（Amplifyのドメインのみ。例: https://xxxx.amplifyapp.com）
   ▼
[AWS Amplify Hosting]
   ├─ 静的アセット（/, /assets/* 等）        → React(Vite) SPAをそのまま配信
   └─ /api/<*> , /auth/<*>                  → rewrite（200プロキシ）で下記へ転送
          │  HTTP（Amplify/CloudFront内部からLightsailへの通信。証明書不要）
          ▼
      [nginx (80番のみ)] on Lightsail
         │  reverse proxy → 127.0.0.1:3000
         ▼
      [Express (Node.js, pm2管理)] on Lightsail
         │  ファイルI/O
         ▼
      [SQLite ファイル（/opt/app/data/app.db）] on Lightsailの永続ディスク
```

> 個人開発・単一運用者のため、DBの定期バックアップ（S3スナップショット等）は現時点では未実装（2026-07-04、いったん削除）。
> 必要になったら`aws-infra`サブエージェントで再構築する。詳細→`PLAN.md`

**方式の要点**：ブラウザは常にAmplifyのドメインとしか通信しない（Lightsailと直接通信しない）。
Amplify Hostingの「リライト」機能で `/api/<*>` `/auth/<*>` へのリクエストをLightsailの静的IPへ
プロキシする（AWS公式にサポートされる構成。CloudFrontがサーバー間でoriginを取得する形になるため
ブラウザ視点では同一オリジン扱いになり、CORS設定やCookieの `SameSite=None` 対応が不要になる）。
副次効果として、ドメイン購入・DNS設定・Let's Encrypt証明書の発行/更新監視が一切不要になる。

外部API：GitHub API（push用）、Anthropic API（UMPIRE生成・翻訳サジェスト）、GitHub OAuth（認証）。
いずれもExpress側の環境変数として保持し、フロントエンドには一切埋め込まない（要件定義書6章）。

---

## 1. 事前準備チェックリスト（人間の作業・Claude Codeでは代行不可）

- [ ] AWSアカウントを作成する
- [ ] AWS CLI をローカルにインストールする（`brew install awscli` 等）
- [ ] Terraform をローカルにインストールする（`brew install terraform`、v1.5以上）
- [ ] GitHub OAuth Appを登録し、Client ID / Client Secretを発行する
- [ ] Anthropic APIキーを発行する（console.anthropic.com）

> ドメイン名は不要です。プロキシ方式（0章参照）によりAmplify Hostingの既定ドメイン
> （`https://xxxx.amplifyapp.com`）だけで完結します。

---

## 2. ローカル環境の準備

### 2.1 SSH鍵ペアの作成

Lightsailインスタンスへログインするための鍵ペアをローカルで作成します（Lightsail側では作らず、公開鍵をTerraformでインポートする方式）。

```bash
ssh-keygen -t ed25519 -f ~/.ssh/lightsail_interview_prep -C "interview-prep-lightsail"
# パスフレーズは任意（推奨：設定する）
```

### 2.2 自分のグローバルIPアドレスを確認（SSH許可用）

```bash
curl -s https://checkip.amazonaws.com
```

固定IPでない場合は、変わるたびに `infra/terraform/terraform.tfvars` の `allowed_ssh_cidr` を更新して `terraform apply` し直す必要があります（下記6章参照）。

---

## 3. Terraform実行用IAMユーザーの作成（AWSコンソールで実施）

Terraformを実行するローカル環境に権限を持たせるためのIAMユーザーを作成します。

1. AWSコンソール → IAM → ユーザー → 「ユーザーを作成」
2. ユーザー名：`interview-prep-terraform-admin`（任意）
3. 「プログラムによるアクセス」を有効化し、アクセスキーを発行
4. 以下のインラインポリシーをアタッチ（最小権限に近い構成。個人開発なので簡略化しています）：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Lightsail",
      "Effect": "Allow",
      "Action": "lightsail:*",
      "Resource": "*"
    },
    {
      "Sid": "Budgets",
      "Effect": "Allow",
      "Action": "budgets:*",
      "Resource": "*"
    }
  ]
}
```

5. 発行されたアクセスキーID・シークレットキーをローカルに設定：

```bash
aws configure --profile interview-prep
# AWS Access Key ID / Secret Access Key を入力
# Default region name: ap-northeast-1
export AWS_PROFILE=interview-prep
```

---

## 4. Terraformでインフラをプロビジョニング

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# terraform.tfvars を開いて以下を実際の値に書き換える：
#   ssh_public_key_path        (2.1で作成した公開鍵のパス)
#   allowed_ssh_cidr           (2.2で確認した自分のIP/32)
#   budget_notification_email (通知を受け取りたいメールアドレス)

terraform init
terraform plan   # 作成されるリソースを確認
terraform apply  # "yes" と入力して実行
```

適用後、以下を控えておきます（後続の手順・GitHub Secretsで使用）：

```bash
terraform output lightsail_static_ip
```

このコマンドで作成される主なリソース：
- Lightsail小型インスタンス（Ubuntu 22.04, micro_2_0プラン, 月$5）＋静的IP＋ファイアウォール
- 月次コストアラート（AWS Budgets）

---

## 5. Lightsailインスタンスへの初回SSHログインと動作確認

```bash
ssh -i ~/.ssh/lightsail_interview_prep ubuntu@$(terraform output -raw lightsail_static_ip)
```

ログイン後、`bootstrap.sh`（`infra/scripts/bootstrap.sh`、user-dataとして初回起動時に自動実行済み）が
正常に完了しているか確認します：

```bash
sudo cat /var/log/bootstrap.log | tail -30
node -v      # v24.x が表示されればOK
pm2 -v
nginx -v
sqlite3 --version
```

もし途中で失敗している場合は、`infra/scripts/bootstrap.sh` の内容を手動で1行ずつ実行して原因を切り分けてください。

---

## 6. アプリ用ディレクトリ・.envファイルの配置

`bootstrap.sh` により以下のディレクトリは作成済みです：

```
/opt/app/releases/   # CIがビルド成果物を配置（世代管理）
/opt/app/current      # releases/<sha> へのシンボリックリンク（現行バージョン）
/opt/app/shared/      # .env・ログなど、デプロイのたびに上書きされない永続領域
/opt/app/data/         # SQLite本体（app.db）
```

`.env`（本番用の実値）をローカルから安全にコピーします（`.env.example`をベースに値を埋めたファイルをローカルで用意しておくこと）：

```bash
scp -i ~/.ssh/lightsail_interview_prep ./.env ubuntu@$(terraform output -raw lightsail_static_ip):/opt/app/shared/.env
```

サーバー側で権限を絞ります：

```bash
ssh -i ~/.ssh/lightsail_interview_prep ubuntu@$(terraform output -raw lightsail_static_ip)
chmod 600 /opt/app/shared/.env
```

このファイルは以後、GitHub Actionsのデプロイでは一切上書きされません（`infra/scripts/deploy-backend.sh`がシンボリックリンクするだけのため）。

---

## 7. nginx配置 と Amplify Hosting のリライト設定（プロキシ方式）

ドメイン・証明書は使いません。nginxはHTTP（80番）のみで待ち受け、Amplify Hostingの
リライト機能がブラウザからのAPIリクエストをこのLightsailインスタンスへ転送します。

### 7.1 サーバー上でnginx設定を配置

```bash
scp -i ~/.ssh/lightsail_interview_prep infra/nginx/app.conf.template \
  ubuntu@$(terraform output -raw lightsail_static_ip):/tmp/app.conf

ssh -i ~/.ssh/lightsail_interview_prep ubuntu@$(terraform output -raw lightsail_static_ip)
sudo mv /tmp/app.conf /etc/nginx/sites-available/app.conf
sudo ln -sf /etc/nginx/sites-available/app.conf /etc/nginx/sites-enabled/app.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 7.2 Amplify Hosting側のリライトルール設定

Amplifyコンソール → 対象アプリ → 「ホスティング」→「リライトとリダイレクト」で、
**上から評価される順**に以下のルールを追加する（9章でアプリ自体を作成した後に設定）。

| # | 送信元アドレス | 送信先アドレス | タイプ |
|---|---|---|---|
| 1 | `/api/<*>` | `http://<lightsail_static_ip>/api/<*>` | 200（書き換え） |
| 2 | `/auth/<*>` | `http://<lightsail_static_ip>/auth/<*>` | 200（書き換え） |
| 3 | `/<*>`（SPAのクライアントサイドルーティング対応。React Routerで `/attempts/123` 等に直接アクセス・リロードしても404にならないようにするため） | `/index.html` | 200（書き換え） |

`<lightsail_static_ip>` は `terraform output -raw lightsail_static_ip` の値に置き換える。
ルール1・2はHTTP（証明書不要。0章のアーキテクチャ図参照）、ルール3は静的アセットのフォールバック。
**ルールの順序が重要**：APIパスのルールを先に評価させないと、`/api/*` までSPAのindex.html書き換え
（ルール3）に食われてしまう。

> 補足：この方式によりブラウザは常に `https://xxxx.amplifyapp.com` としか通信しないため、
> Express側にCORSミドルウェアや `SameSite=None` Cookie設定は不要（`docs/design/02-api-design.md` 参照）。

---

## 8. GitHub OAuth Appの登録（12章）

> **前後関係の注意**：Homepage URL・Callback URLには本来9章で作るAmplifyのドメインを指定するが、
> この時点ではまだAmplifyアプリが存在しない。GitHub OAuth AppのURLは登録後いつでも編集できるため、
> ここでは**仮のURL（例：`https://example.com`）で登録**しておき、9章でAmplifyのドメインが確定した
> 時点でOAuth App設定画面に戻ってURLだけ実際の値に差し替えればよい（Client ID/Secretは変わらない）。

1. GitHub → 右上アイコン → Settings → Developer settings → OAuth Apps → New OAuth App
2. Application name: 任意（例: `InterviewPrep`）
3. Homepage URL: 仮のURL（例: `https://example.com`。9章のAmplify作成後に本来の値へ差し替える）
4. Authorization callback URL: 仮のURL（例: `https://example.com/auth/github/callback`。
   9章でAmplifyのドメインが確定したら **Amplifyのドメイン配下**のコールバックエンドポイント
   （例: `https://main.xxxxx.amplifyapp.com/auth/github/callback`。プロキシ方式のため、ブラウザから
   は常にAmplifyのドメインにアクセスする。7.2のリライトルールにより実体はLightsail上のExpressが
   処理する。パス自体はimplementer側の実装に合わせて確定させること）に差し替える
5. 発行された Client ID / Client Secret を `.env` の `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` に設定
6. `.env` の `GITHUB_ALLOWED_USERNAME` に自分のGitHubユーザー名（`asab0o`）を設定
   （13章：このユーザー名以外はログイン不可にする単一ユーザー制限。これはURLと無関係なので今設定してよい）
7. `.env` の `PUBLIC_APP_URL` に **Authorization callback URLのオリジン部分と同じ値**
   （例: `https://main.xxxxx.amplifyapp.com`。httpsのAmplifyドメイン）を設定する。
   Expressはこの値から `redirect_uri`（`${PUBLIC_APP_URL}/auth/github/callback`）を組み立ててGitHubへ送る。
   プロキシ経路（CloudFront→nginx）では `X-Forwarded-Proto` が常に `http` になり、passportの
   自動判定に任せると `http://...` の `redirect_uri` が送られて `redirect_uri_mismatch` になるため、
   環境変数による絶対URL指定が必須。9章でAmplifyドメイン確定後、Callback URLの差し替えと同時にこの値も更新すること

---

## 9. Amplify Hostingの作成（フロントエンド）

Amplify HostingはGitHubとの連携をコンソール側のOAuth接続（Amplify GitHub App）で行う必要があるため、
初回作成はAWSコンソールから行うことを推奨します（Terraformでも`aws_amplify_app`リソースは作成可能ですが、
GitHubの認可トークンの扱いが煩雑なため、個人開発ではコンソール操作の方が簡単・安全です）。

1. AWSコンソール → Amplify → 「新しいアプリの作成」→ 「ウェブアプリをホスト」
2. Gitプロバイダ：GitHub を選択し、認可（初回のみGitHub App連携画面が出る）
3. リポジトリ：本リポジトリ、ブランチ：`main`
4. ビルド設定（例。`frontend/`配下にVite+Reactアプリがある想定。実際のディレクトリ構成に合わせて調整）：

```yaml
version: 1
applications:
  - appRoot: frontend
    frontend:
      phases:
        preBuild:
          commands:
            - nvm use 24
            - corepack enable
            - pnpm install --frozen-lockfile
        build:
          commands:
            - pnpm run build
      artifacts:
        baseDirectory: dist
        files:
          - "**/*"
      cache:
        paths:
          - node_modules/**/*
          - .pnpm-store/**/*
```

> パッケージマネージャは **pnpm**（npm/yarnは使わない）。Node.jsはローカル・CI・Lightsailと揃えて
> **24系**を使う（Amplifyビルドイメージはnvm同梱のため`nvm use 24`で切り替える）。NodeにはCorepackが
> 同梱されており追加インストール不要。pnpmの具体的なバージョンは`frontend/package.json`の
> `packageManager`フィールドからCorepackが自動解決する（バージョンの正はそのフィールドのみ）。

5. 環境変数：不要（プロキシ方式のためフロントエンドはAPIのURLを一切持たない。`/api/...` への
   相対パスでfetchするだけでよい。`docs/design/03-frontend-structure.md`参照）
6. 「保存してデプロイ」→ 初回ビルドが自動的に走る
7. デプロイ完了後、7.2の手順でリライトルールを設定する（初回のアプリ作成が終わってからでないと
   `terraform output -raw lightsail_static_ip` を転記する設定画面に到達できないため、この順序でよい）
8. 以降、`main`ブランチへのpushのたびにAmplifyが自動的にビルド・デプロイを行う
   （GitHub Actions側のCI/CD設計は`docs/deployment-cicd.md`参照）

---

## 10. バックエンド初回デプロイ（手動）

GitHub Actions経由の自動デプロイ（`docs/deployment-cicd.md`参照）を有効化する前に、初回は手動で動作確認することを推奨します。

```bash
# ローカルでbackendをビルド（パッケージマネージャはpnpm。CLAUDE.md参照）
cd backend
pnpm install --frozen-lockfile
pnpm run build

# サーバーへ配置
RELEASE_ID=manual-$(date +%Y%m%d%H%M%S)
ssh -i ~/.ssh/lightsail_interview_prep ubuntu@<static-ip> "mkdir -p /opt/app/releases/${RELEASE_ID}"
rsync -az -e "ssh -i ~/.ssh/lightsail_interview_prep" \
  dist package.json pnpm-lock.yaml \
  ubuntu@<static-ip>:/opt/app/releases/${RELEASE_ID}/
scp -i ~/.ssh/lightsail_interview_prep \
  ../infra/scripts/deploy-backend.sh ../infra/pm2/ecosystem.config.js.template \
  ubuntu@<static-ip>:/opt/app/releases/${RELEASE_ID}/

ssh -i ~/.ssh/lightsail_interview_prep ubuntu@<static-ip> \
  "cp /opt/app/releases/${RELEASE_ID}/ecosystem.config.js.template /opt/app/releases/${RELEASE_ID}/ecosystem.config.js && \
   chmod +x /opt/app/releases/${RELEASE_ID}/deploy-backend.sh && \
   bash /opt/app/releases/${RELEASE_ID}/deploy-backend.sh ${RELEASE_ID}"

# 動作確認
curl http://<static-ip>/health   # または https://api.example.com/health
pm2 status
pm2 logs interview-prep-api --lines 50
```

---

> SQLiteの定期バックアップ（S3スナップショット等）は個人開発・単一運用者のため2026-07-04時点で
> いったん見送り。必要になったら`aws-infra`サブエージェントで再構築する（`PLAN.md`参照）。

## 11. 動作確認・ヘルスチェック

- [ ] `https://<Amplifyのドメイン>` にアクセスしてフロントエンドが表示される
- [ ] `https://<Amplifyのドメイン>/api/categories` 等、`/api/*` `/auth/*` へのアクセスが
      7.2のリライトルール経由でLightsailのExpressまで到達する（ブラウザのNetworkタブで
      レスポンスが返ることを確認。CORSエラーが出ないこと＝同一オリジン扱いになっている証拠）
- [ ] React Routerの下位パス（例 `/attempts/1`）に直接アクセス・リロードしても404にならない
      （7.2のルール3＝SPAフォールバックの確認）
- [ ] GitHub OAuthログインができ、`GITHUB_ALLOWED_USERNAME`以外のアカウントでは拒否される
- [ ] ログイン後のセッションCookieが維持される（ページ再読み込みでログアウトされない）
- [ ] バックエンドAPIへのリクエストがnginx経由でExpressに到達する（IP直叩きの`/health`等）
- [ ] AWS Budgetsの通知メールが届く設定になっている（テストには数日〜1ヶ月かかる点に注意）

---

## 12. コスト管理

- Lightsail micro_2_0：月$5固定
- Amplify Hosting：ビルド時間・ホスティング容量ともに無料枠内でほぼ収まる想定（トラフィックが増えた場合は要確認）
- AWS Budgets：予算アラート自体は無料（一定数まで）

将来的にRDS(PostgreSQL)やApp Runan等へ移行する場合は、要件定義書8章の通りマルチユーザー化や負荷増加時のみ検討すること。
現時点ではこの軽量構成を維持する方針。
