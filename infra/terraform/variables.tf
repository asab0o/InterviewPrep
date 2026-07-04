variable "aws_region" {
  description = "AWSリージョン（東京）"
  type        = string
  default     = "ap-northeast-1"
}

variable "project_name" {
  description = "リソース命名に使うプロジェクト名（プレフィックス）"
  type        = string
  default     = "interview-prep"
}

variable "lightsail_bundle_id" {
  description = <<-EOT
    Lightsailインスタンスのプラン（bundle）。
    - nano_2_0  : 512MB RAM / 2 vCPU / 20GB SSD / 月$3.5
    - micro_2_0 : 1GB RAM  / 2 vCPU / 40GB SSD / 月$5  ← requirements.md 8章の想定に一致
    要件定義（月$5〜）に合わせて micro_2_0 をデフォルトとする。
  EOT
  type    = string
  default = "micro_2_0"
}

variable "lightsail_blueprint_id" {
  description = "OSブループリント（Ubuntu LTSを使用）"
  type        = string
  default     = "ubuntu_22_04"
}

variable "availability_zone_suffix" {
  description = "アベイラビリティゾーンのサフィックス（a/b/c）"
  type        = string
  default     = "a"
}

variable "ssh_public_key_path" {
  description = "Lightsailにインポートする公開鍵ファイルのパス（例: ~/.ssh/lightsail_interview_prep.pub）。事前にssh-keygenで作成しておくこと。"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = <<-EOT
    SSH(22番ポート)を許可するCIDR。自宅/職場の固定グローバルIPを "x.x.x.x/32" 形式で指定することを強く推奨。
    固定IPがない場合は一時的に "0.0.0.0/0" にしてapplyし、作業完了後すぐ絞り直すこと。
  EOT
  type = string
}

variable "budget_limit_usd" {
  description = "月次コストアラートのしきい値（USD）。クレジット枯渇後も低コスト維持を監視するため。"
  type        = number
  default     = 15
}

variable "budget_notification_email" {
  description = "予算超過（フォーキャスト/実績）通知を受け取るメールアドレス"
  type        = string
}

variable "tags" {
  description = "全リソース共通タグ"
  type        = map(string)
  default = {
    Project   = "interview-prep"
    ManagedBy = "terraform"
  }
}
