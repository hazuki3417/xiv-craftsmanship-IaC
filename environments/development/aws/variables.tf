variable "aws_region" {
  type        = string
  description = "AWS region; must match selected account's DNS/IAM setup"
}
variable "instance_type" {
  type        = string
  default     = "t3.medium"
  description = "2 vCPU, 4 GiB starting point; validate under load"
}
variable "root_volume_size_gib" {
  type        = number
  default     = 30
  validation {
    condition     = var.root_volume_size_gib >= 20
    error_message = "Root disk must be at least 20 GiB."
  }
}
variable "vpc_cidr" {
  type    = string
  default = "10.75.0.0/16"
}
variable "public_subnet_cidr" {
  type    = string
  default = "10.75.1.0/24"
}
variable "domain_name" {
  type    = string
  default = "xiv-craftsmanship.com"
}
variable "hosted_zone_id" {
  type        = string
  default     = ""
  description = "Existing public Route53 Hosted Zone ID; leave empty until verified"
}
variable "manage_dns_record" {
  type        = bool
  default     = false
  description = "Opt in only after checking legacy CloudFormation DNS ownership"
}
