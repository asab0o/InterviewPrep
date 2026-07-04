# ============================================================
# 月次コストアラート（AWS Budgets）
# 「クレジット枯渇後も低コストで維持できる軽量構成」という方針を運用面で担保するため、
# 想定外の課金増加（誤ってRDS/App Runner等を作成してしまった、Amplifyのビルド分数超過 等）
# を早期に検知できるようにする。
# ============================================================

resource "aws_budgets_budget" "monthly_cost_alert" {
  name         = "${var.project_name}-monthly-budget"
  budget_type  = "COST"
  limit_amount = tostring(var.budget_limit_usd)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type              = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = [var.budget_notification_email]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type              = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = [var.budget_notification_email]
  }
}
