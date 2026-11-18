# Existing hosted zone is deliberately NOT Terraform-managed.
# Enable only after removing/importing any legacy CloudFormation-owned record.
resource "aws_route53_record" "web" {
  count   = var.manage_dns_record ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = 300
  records = [aws_eip.app.public_ip]
  lifecycle {
    precondition {
      condition     = var.hosted_zone_id != ""
      error_message = "Set hosted_zone_id after checking the existing Hosted Zone and legacy stack ownership."
    }
  }
}
