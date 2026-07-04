#!/bin/bash
# ============================================================
# Lightsail初回起動時に自動実行されるセットアップスクリプト（cloud-init user-data）
# infra/terraform/lightsail.tf の user_data として設定される。
#
# 目的：Node.js / pm2 / nginx / sqlite3 など「実行環境」だけを用意する。
# アプリケーションコードのデプロイ・.envの配置はこのスクリプトでは行わない
# （CI/CD・人間の初回セットアップ手順 [docs/infra-setup.md] 側の責務にする）。
# ============================================================
set -euxo pipefail

exec > >(tee -a /var/log/bootstrap.log) 2>&1
echo "=== bootstrap start: $(date -u) ==="

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

# Node.js 24.x LTS（ローカル開発環境・CI と揃える。CLAUDE.md参照）
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs

# pnpm（プロジェクトのパッケージマネージャ。npm/yarnは使わない方針）
# Node 24には Corepack が同梱されているため、それ経由でpnpmを有効化する。
# pnpmの具体的なバージョンはここでは固定せず、各プロジェクトの package.json の
# `packageManager` フィールドからCorepackが自動解決する（バージョンの正はそのフィールドのみ）
corepack enable

# 基本パッケージ
apt-get install -y \
  git \
  sqlite3 \
  nginx \
  unzip \
  build-essential \
  unattended-upgrades \
  rsync

# pm2（プロセスマネージャ）をグローバルインストール
npm install -g pm2

# アプリ配置用ディレクトリ（デプロイ先。所有者はubuntu）
#   /opt/app/releases/<git-sha>/  ... CIがビルド成果物を配置する場所（世代管理）
#   /opt/app/current              ... releases/<sha> へのシンボリックリンク（現行バージョン）
#   /opt/app/shared/.env          ... デプロイのたびに上書きされない永続的な環境変数ファイル
#   /opt/app/data/app.db          ... SQLite本体（DB_PATHと一致させる）
mkdir -p /opt/app/releases
mkdir -p /opt/app/shared
mkdir -p /opt/app/data
mkdir -p /opt/app/scripts
chown -R ubuntu:ubuntu /opt/app

# pm2をubuntuユーザーのsystemd起動対象に登録（再起動後もアプリが自動起動するように）
env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu || true

# nginxのデフォルトサイトは無効化（後でdocs/infra-setup.mdの手順に従いinfra/nginx/app.conf.templateを配置する）
rm -f /etc/nginx/sites-enabled/default || true
systemctl restart nginx || true

echo "=== bootstrap done: $(date -u) ==="
