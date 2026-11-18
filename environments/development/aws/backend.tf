terraform {
  backend "s3" {
    key          = "xiv-craftsmanship/development/aws/terraform.tfstate"
    encrypt      = true
    use_lockfile = true
  }
}
