output "instance_id" {
  value = aws_instance.app.id
}
output "elastic_ip" {
  value = aws_eip.app.public_ip
}
output "ssm_start_session" {
  value = "aws ssm start-session --target ${aws_instance.app.id} --region ${var.aws_region}"
}
