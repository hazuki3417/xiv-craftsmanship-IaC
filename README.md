# xiv-craftsmanship Infrastructure (Terraform)

The target platform is **one EC2 instance + Docker Compose** serving Caddy, Next.js, Go API and PostgreSQL. Infrastructure is Terraform (HCL); application images are built in their own repositories and published to **private GHCR**. EC2 deployment is **manual** through AWS Systems Manager (SSM).

**This branch is implementation-in-progress. It has not been applied to AWS or verified on an EC2 host.** See [target architecture](docs/terraform-target-architecture.md), [operations](docs/deployment-operations.md), and [legacy replacement](docs/cloudformation-migration-plan.md).

## Layout

- `bootstrap/aws`: Terraform state S3 bucket; initial local state, then migrate to remote state.
- `environments/development/aws`: EC2, single public subnet, security group, EIP, IAM/SSM and opt-in DNS.
- `runtime/development`: four-container Compose, Caddyfile, image-pull and deploy scripts.
- `.github/workflows/quality.yml`: static checks with **no AWS credentials, plan or apply**.

## Local static checks

Terraform >=1.10; Docker Compose v2 and Bash are required for the corresponding validations:

```sh
terraform fmt -recursive -check
terraform -chdir=bootstrap/aws init -backend=false -input=false
terraform -chdir=bootstrap/aws validate
terraform -chdir=environments/development/aws init -backend=false -input=false
terraform -chdir=environments/development/aws validate
docker compose --env-file runtime/development/.env.example -f runtime/development/compose.yaml config --quiet
bash -n runtime/development/*.sh
```

Provider lock files should be generated with the exact validated Terraform/provider version and committed after review. Never commit local state, secrets or `*.tfvars`.

## AWS preparation (not performed)

1. Confirm the AWS account, Region, existing CloudFormation stacks and Route 53 Hosted Zone / root A record ownership.
2. Decide whether the public site is treated as `development` or a new `production` root; the current root name is only a working default.
3. Bootstrap a private S3 state bucket. First run uses local state, which must be protected; migrate that state into the remote backend safely. Set the backend bucket and region via `-backend-config`.
4. Review `terraform plan` before **any** `apply`. DNS record creation is deliberately disabled by default via `manage_dns_record = false` until legacy record ownership is resolved.
5. Verify Docker Compose v2 is installed on EC2; Amazon Linux User Data installs Docker but **does not assume a Compose plugin is available**. Install/verify it deliberately before deployment.
6. Publish the three private GHCR images via the component repositories. Record immutable image digests.
7. Create a secret runtime.env on the instance (chmod 600) outside Git, e.g. `/etc/xiv-craftsmanship/development.env`. Use the example only as a template. Pull images with ephemeral GitHub read:packages authentication, then execute `runtime/development/deploy.sh` via SSM. Do not expose SSH or any internal service ports.
8. Check Caddy HTTPS, browser -> Web -> API -> PostgreSQL, persistence across simple container replacement and behavior after DB image rebuild.

The DB uses a local Docker named volume stored on the EC2 root EBS. This prevents accidental data loss during routine container replacement but **is not a backup** and will be lost if the host disk is replaced or deleted. The user has accepted no backup/HA. Caddy uses a separate local certificate volume.

No Terraform Cloud changes, DNS cutovers, CloudFormation destroys or container deploys are authorized by this README.
