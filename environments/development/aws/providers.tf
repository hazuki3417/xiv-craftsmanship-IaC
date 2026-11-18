provider "aws" {
  region = var.aws_region
  default_tags {
    tags = { Project = "xiv-craftsmanship", Environment = "development", ManagedBy = "terraform" }
  }
}
