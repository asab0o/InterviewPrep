output "lightsail_static_ip" {
  description = "LightsailインスタンスにアタッチされたIPアドレス。DNS(Aレコード)・GitHub ActionsのSecretに設定する"
  value       = aws_lightsail_static_ip.app.ip_address
}

output "lightsail_instance_name" {
  value = aws_lightsail_instance.app.name
}
