# ============================================================
# Lightsail小型インスタンス（Express + SQLite同居）
# 要件定義書 8章：AWS Lightsail 小型インスタンス（月$5〜）
# ============================================================

resource "aws_lightsail_key_pair" "app" {
  name       = "${var.project_name}-key"
  public_key = file(var.ssh_public_key_path)
}

resource "aws_lightsail_instance" "app" {
  name              = "${var.project_name}-app"
  availability_zone = "${var.aws_region}${var.availability_zone_suffix}"
  blueprint_id      = var.lightsail_blueprint_id
  bundle_id         = var.lightsail_bundle_id
  key_pair_name     = aws_lightsail_key_pair.app.name

  # 初回起動時（cloud-init）に実行される最小セットアップ。
  # Node.js / pm2 / nginx / sqlite3 / awscli など「実行環境」だけを用意する。
  # アプリ本体のデプロイ（コード配置）はここでは行わず、CI/CD（GitHub Actions）側に任せる。
  user_data = file("${path.module}/../scripts/bootstrap.sh")

  tags = var.tags
}

# 静的IP（インスタンス再起動でIPが変わらないようにする。Amplify/DNS/GitHub Actionsのsecretから参照）
resource "aws_lightsail_static_ip" "app" {
  name = "${var.project_name}-static-ip"
}

resource "aws_lightsail_static_ip_attachment" "app" {
  static_ip_name = aws_lightsail_static_ip.app.name
  instance_name  = aws_lightsail_instance.app.name
}

# ファイアウォール（開放ポート）
# - 22  : SSH。allowed_ssh_cidr で自分のIPに絞ることを強く推奨
# - 80  : HTTP（nginxがリバースプロキシとしてExpress:3000へ転送）
#
# 構成方針：ドメイン・証明書は使わず、Amplify Hosting の rewrite（リライト）機能で
# ブラウザ→Amplify(HTTPS)→[CloudFront内部]→Lightsail(HTTP:80) というプロキシ経路にする。
# ブラウザは常にAmplifyドメインとしか通信しないため、Lightsail側にTLS終端は不要（443は開放しない）。
# 詳細は docs/infra-setup.md 7章 参照。
resource "aws_lightsail_instance_public_ports" "app" {
  instance_name = aws_lightsail_instance.app.name

  port_info {
    protocol  = "tcp"
    from_port = 22
    to_port   = 22
    cidrs     = [var.allowed_ssh_cidr]
  }

  port_info {
    protocol  = "tcp"
    from_port = 80
    to_port   = 80
    cidrs     = ["0.0.0.0/0"]
  }
}
