terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # 個人利用・単一運用者のため、デフォルトではローカルstate（terraform.tfstate）を使用する。
  # ただしSSH鍵ペア等の機密情報が state ファイルに平文で残るため、
  # 絶対にリポジトリへコミットしないこと（infra/terraform/.gitignore で除外済み）。
  # 複数端末から作業する可能性がある場合は、S3 + DynamoDB のリモートバックエンドへの
  # 切り替えを検討すること（下記はコメントアウトのサンプル）。
  #
  # backend "s3" {
  #   bucket         = "interview-prep-tfstate-CHANGE-ME"
  #   key            = "interview-prep/terraform.tfstate"
  #   region         = "ap-northeast-1"
  #   dynamodb_table = "interview-prep-tfstate-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}
