#!/bin/bash
# ============================================================
# GitHub Actionsからssh経由で呼び出される、サーバー側のデプロイ実行スクリプト。
#
# 前提：呼び出し元（CI）が /opt/app/releases/<RELEASE_ID>/ に
# ビルド済みのbackendコード（dist/, package.json, pnpm-lock.yaml, ecosystem.config.js等）
# をrsync/scpで事前に転送済みであること。
# パッケージマネージャはpnpm（bootstrap.shでcorepack経由で有効化済み）。
#
# 使い方: ./deploy-backend.sh <RELEASE_ID>
#   例: ./deploy-backend.sh $(git rev-parse HEAD)
# ============================================================
set -euo pipefail

RELEASE_ID="${1:?RELEASE_ID（例: gitのSHA）を指定してください}"
APP_ROOT="/opt/app"
RELEASE_DIR="${APP_ROOT}/releases/${RELEASE_ID}"
CURRENT_LINK="${APP_ROOT}/current"
SHARED_ENV="${APP_ROOT}/shared/.env"
APP_NAME="interview-prep-api"

if [ ! -d "$RELEASE_DIR" ]; then
  echo "ERROR: release dir not found: $RELEASE_DIR"
  exit 1
fi

if [ ! -f "$SHARED_ENV" ]; then
  echo "ERROR: ${SHARED_ENV} が存在しません。docs/infra-setup.md の初回セットアップ手順に従って作成してください"
  exit 1
fi

mkdir -p "${APP_ROOT}/shared/logs"

cd "$RELEASE_DIR"
pnpm install --prod --frozen-lockfile

# .envは共有パスからシンボリックリンクする（CIのデプロイのたびに上書きされないようにするため）
ln -sfn "$SHARED_ENV" "${RELEASE_DIR}/.env"

# 必要であればここでDBマイグレーションを実行する（実装側でpackage.jsonにscriptが定義された場合）
# pnpm run migrate --if-present

# current へのシンボリックリンクを切り替え（アトミックなリリース切り替え）
ln -sfn "$RELEASE_DIR" "$CURRENT_LINK"

# pm2でリロード（初回はstart、以降はreload）
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  pm2 start "${CURRENT_LINK}/ecosystem.config.js"
fi
pm2 save

# 古いリリースは直近5世代だけ残して削除（ディスク容量節約。SSDは40GBしかないため）
cd "${APP_ROOT}/releases"
ls -1t | tail -n +6 | xargs -r rm -rf

echo "Deploy of release ${RELEASE_ID} complete"
