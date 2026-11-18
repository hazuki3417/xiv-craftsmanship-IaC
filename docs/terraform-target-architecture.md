# Terraform + EC2/Docker 移行設計（レビュー用）

ステータス: **基本方針合意・詳細設計レビュー待ち**。本書は設計案であり、Terraform実装・AWSデプロイは未実施。

## 1. 目的・非目標

xiv-craftsmanshipは製作品のBOMと必要素材数量を参照する小規模Webアプリケーションであり、常時運用費を抑える。現在のAWS CDK / CloudFormation + ECS Fargate + ALB + ECRから、Terraform + 単一EC2 + Docker Compose + GHCRへ移行する。

- 一般公開のWebサービスとして `xiv-craftsmanship.com` をHTTPSで提供する。
- 既存のWeb（Next.js）、API（Go）、PostgreSQLの3アプリケーションコンテナを維持する。
- TLS終端・Reverse Proxyとして公式Caddyイメージを追加し、合計4コンテナとする。
- 単一インスタンスの停止・障害によるサービス停止を許容し、冗長化、HA、ALB、ECS、RDS、NAT Gatewayは使用しない。
- DBの定期バックアップと永続データ用EBSの追加は要件としない。DBは初期化用データセットから再生成できることを**実機で検証**する。
- Terraform Stateの保護はアプリDBバックアップとは別責務として必須とする。

参照元: [memoria-designのTerraform設計ブランチ](https://github.com/hazuki3417/memoria-design/blob/docs/terraform-infrastructure/content/system/infrastructure/index.mdx)、[memoria-IaCのTerraform作業ブランチ](https://github.com/hazuki3417/memoria-IaC/tree/chore/terraform-foundation)。これらは現在の`develop`の内容を指すものではない。設計を参考にするが、memoriaのメディアS3、Redis、Worker、DBバックアップなどは導入しない。

## 2. 論理構成

```text
Internet client
  -> Route 53: xiv-craftsmanship.com
  -> Elastic IP / Public subnet / Security Group (TCP 80,443)
  -> EC2 (Amazon Linux 2023; Docker Compose)
       caddy (official image; :80/:443; TLS; persistent /data volume)
         -> web (private GHCR; Next.js :3000; no public host port)
              -> api (private GHCR; Go :8080; no public host port)
                   -> db (private GHCR; PostgreSQL :5432; no public host port)
```

WebとAPIの間はCompose network上で `api:8080` を使用する。既存WebのNext.js rewriteの `localhost:8080` はコンテナ分離により使用できないため修正する。ブラウザから内部の `api` 名を直接参照させず、同一オリジンの `/api` などをWeb側でプロキシする。実際の環境変数・ビルド時/実行時の差異はWeb側の変更として検証する。

APIとPostgreSQLの接続はCompose service名 `db` を使用し、DBポートをホストにPublishしない。CaddyはWebのみへproxyする。CaddyとWebの起動順・healthcheck、API/DBのhealthcheckを定義し、DB初期化完了までの待機を明示する。

## 3. Terraformの管理範囲

- **Bootstrap root**: State専用private S3 bucket（versioning、SSE-S3、Public Access Block、HTTPS必須、削除保護）を管理。bootstrap初回はLocal Stateから始まり、Remote Stateへの移行を手順化する。
- **Development root**: VPC、public subnet、IGW、route table、Security Group（80/443公開、SSH/3000/8080/5432を非公開）、EC2、暗号化されたroot EBS、Elastic IPとそのassociation、必要最小限のIAM instance profile、SSM管理権限、Route 53のA recordを管理。
- **Instance bootstrap**: Amazon Linux 2023にDockerとCompose pluginを導入し、daemonを起動する。Runtime設定・Private GHCR認証・コンテナ起動はTerraform applyから分離する。
- **Terraform State**: S3 backend + Terraform 1.10以降の `use_lockfile = true`。bootstrapとenvironmentでState keyを分離する。Stateにアプリの認証情報を含めない。
- **Caddy TLS**: Caddyによる自動取得・更新。証明書データの `/data` は永続Docker volumeへ保存する。EC2再構築時に証明書が消える場合の再取得およびCA rate limitに注意する。

インスタンスタイプは初期候補 `t3.medium`（2 vCPU、4 GiB）。これは**確定した性能要件ではない**。リージョン、同時利用者数、DB初期化負荷、実行メモリの計測後に最終決定する。ARM系へ変更する場合は全イメージのarchを検証する。

DBのroot filesystem上のデータはインスタンス交換/コンテナ再生成で失われ得る設計とする。**ユーザー提供データがなく、初期化用DBイメージとSQLから復元できる**ことを移行の受け入れ条件とする。コンテナ更新と初期化の所要時間は要計測。

## 4. リポジトリ構成案

```text
xiv-craftsmanship-IaC/
├── bootstrap/aws/
│   ├── main.tf
│   ├── providers.tf
│   ├── variables.tf
│   ├── versions.tf
│   └── outputs.tf
├── environments/development/aws/
│   ├── backend.tf
│   ├── providers.tf
│   ├── versions.tf
│   ├── variables.tf
│   ├── main.tf
│   ├── network.tf
│   ├── compute.tf
│   ├── iam.tf
│   ├── dns.tf
│   └── outputs.tf
├── runtime/development/
│   ├── compose.yaml
│   ├── Caddyfile
│   ├── .env.example
│   ├── pull-images.sh
│   ├── deploy.sh
│   └── rollback.sh
└── docs/
    ├── terraform-target-architecture.md
    ├── deployment-operations.md
    └── cloudformation-migration-plan.md
```

最初から独立したTerraform module群は作らない。複数環境で具体的に再利用する責務が生じた時点で抽出する。Production rootは一般公開だからといって初回から複製せず、実際の環境運用名（development/staging/production）を適用前に決定する。

## 5. セキュリティと費用

- EC2管理はSSM Session Managerのみ。SSH(22)の公開禁止。instance metadataはIMDSv2必須。
- Public ingressはHTTP(80)/HTTPS(443)に限定し、内部API/DBを公開しない。SecretをTerraform code/state、GitHub Actions logs、イメージに埋め込まない。
- GitHub ActionsではOIDC/短期権限を優先するが、GHCRの発行には対象Repositoryの `GITHUB_TOKEN` と `packages: write` を使用する。
- ECR、ECS、ALB、NAT Gatewayを新環境に含めない。EC2・EBS・IPv4・Route 53・S3 state等の費用は発生する。確定見積にはリージョン・instance type・Disk・転送量が必要。
- 旧DBの `example` 固定パスワードとIAM `*` 権限を新構成へ持ち込まない。

## 6. 未確定事項

1. 対象のAWS account、region、移行対象domain/hosted zoneおよび既存Terraform/CloudFormation管理リソース。
2. Terraform rootのenvironment名（一般公開環境をdevelopmentとするかproductionとするか）とEC2 instance type/容量。
3. GHCR private packageへのEC2側Pull認証（手動一時Token、rotation、permissions）の具体的な手順。
4. DBの再生成可能性・初期化時間・更新時の停止許容時間。
5. 既存Route 53 Hosted Zone、DNS切替および旧CloudFormationの参照関係の扱い。
6. HTTPS公開前に必要なrate limiting、ログ保存期間、最低限の監視範囲（冗長化とは独立の判断）。

設計方針の確定とAWSへの適用許可は別の判断とする。
