variable "aws_region" {
  description = "AWS Region for the Terraform state bucket"
  type        = string
}
variable "state_bucket_name" {
  description = "Globally unique bucket name; supply at apply time"
  type        = string
}
