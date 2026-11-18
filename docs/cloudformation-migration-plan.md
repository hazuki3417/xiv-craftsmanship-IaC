# 旧CDKの廃止とTerraformによる新規構築計画

ステータス: **設計方針合意・AWS実リソース未確認**。既存IaCソースは全面置換を許容。AWS上のリソース削除やTerraform applyは未実施。

## 1. 今回の決定

- **既存のAWS CDK / CloudFormationによるIaC実装はすべて廃止してよい**。旧CDKのstack・construct・namespace・npm依存・関連テストを新IaCの必須資産とはしない。
- 同じ `xiv-craftsmanship-IaC` リポジトリ内でTerraform（HCL）とDocker Composeへ**全面置換**する。旧CDKをTerraformへ段階的に移植する必要はない。
- 廃止対象コードは、Terraform実装・静的検証を含む置換PRで削除する。設計PRではドキュメントのみ変更し、旧CDKコードを途中で削除してリポジトリを空にしない。
- 既存アプリは**現在稼働していないとの申告**を前提とするため、稼働中のサービスを無停止移行することは要求しない。新しいEC2環境を構築してから公開確認する。
- ただし **アプリが非稼働 ≠ AWSリソースが存在しない**。既存のCloudFormation stack、ECR、ECS、ALB、Route 53、IAMなどが残存していれば費用・設定競合が起きるため、AWS実態確認は必須。
- **GitHub上の旧IaCコード削除許可とAWS上の破壊的削除は別**。AWSリソースの操作はaccount/region/stackを確認してから別途実行判断する。Terraform Stateや共有Hosted Zoneを一括削除しない。

## 2. 旧CDKで定義されている構成（参考）

現行 `main` の `src/bin/xiv-craftsmanship.ts` は以下を定義している。

| Stack | 定義上の主要リソース | 新構成での扱い |
| --- | --- | --- |
| `XivCraftsmanship-GitHubActions` | GitHub OIDC provider / IAM role | GHCR発行への変更後は原則不要 |
| `XivCraftsmanship-Ecr` | Web、API、DBのECR | Private GHCRへ変更 |
| `XivCraftsmanship-Infrastructure` | VPC、SG、ECS cluster、ALB、Route 53、ACM、CloudWatch Logs、Service Discovery | Terraformの新VPC/EC2/SSM/DNS + Caddyへ置換 |
| `XivCraftsmanship-DeployDataStoreService` | PostgreSQL Fargate service | Docker Compose上のDBへ置換 |
| `XivCraftsmanship-DeployAppService` | Web/API Fargate service、ALB listener | Docker Compose上のWeb/APIへ置換 |

これはコードに存在する**定義**の一覧であり、実在するAWSリソース一覧ではない。

## 3. 新規構築の順序

| 順序 | 作業 | 確認・制約 |
| --- | --- | --- |
| 0 | AWS read-only棚卸し | CloudFormation stack、DNS Hosted Zone/Record、既存課金リソースの有無を確認 |
| 1 | Terraform・Compose・GHCRの実装 | 旧CDKを削除し、CIのformat/init/validateとCompose構文検証を実施 |
| 2 | Terraform State backendの準備 | S3専用bucket、暗号化、versioning、public access block、lockfile |
| 3 | Terraformで新規EC2構成を作成 | VPC、EC2、EIP、SSM、IAM。既存DNSレコードとの衝突は回避 |
| 4 | GHCRから手動Pull・Compose起動 | Web/API/DB/Caddy、DB初期化、HTTPS疎通を確認 |
| 5 | 公開DNSを新EC2へ設定 | Hosted Zoneを再利用する場合のrecord所有権と旧stackの関連を確認 |
| 6 | 旧AWSリソースの整理 | 実在する不要stackを依存順に廃止。共有リソースは保護し、費用を確認 |

非稼働のためブルーグリーン／ゼロダウンタイム切替は必須ではない。ただしDNSと証明書は実リソースの所有関係を確認する。

順序2-6のCloud操作には対象AWS account/region、実行権限、実リソース、適用内容の確認が必要。ここでの方針合意だけでapply/destroyを実行しない。

## 4. リポジトリの削除対象・残すもの

**置換PRで削除対象となる候補**
- `src/bin/`、`src/lib/`、`src/util/`、`src/test/`、`src/cdk.json`、`src/cdk.context.json` などの旧CDKプロジェクト。
- 旧CDK専用のpackage、lockfile、devbox設定やREADMEのコマンドは新Terraform環境に合わせて削除または置換する。
- 旧ECR/OIDC前提のドキュメント・設定は不要なものを削除する。

**維持・再構成するもの**
- `docs/` の今回の合意済みインフラ設計・運用設計。
- `bootstrap/aws/`、`environments/development/aws/`（環境名は適用前に再確認）、`runtime/development/` を新設。
- `README.md`、`.gitignore`、Quality GateをTerraformとDocker Composeに対応させる。

削除対象はディレクトリ単位で盲目的に消さず、Terraformに必要な内容を置き換えた状態でレビューする。

## 5. AWS資産の確認が依然として必要な理由

既存CDKが `xiv-craftsmanship.com` のHosted Zoneを参照してALB向けAレコードを設定するため、同名レコードが残存していればTerraform側の作成と競合する可能性がある。

既存スタックが存在する場合、**Terraformによる自動Importや既存CloudFormationリソースの二重管理は避ける**。継続利用するDNS Hosted Zoneなどは、既存の所有関係を確認して新構成へ結び付ける。旧stackを削除する際は、依存するRoute 53 Record、ACM、ECR、IAM、共有リソースと課金への影響を確認する。

## 6. 完了条件

- 旧CDK実装・依存関係がIaCリポジトリから撤去され、Terraform/Composeの検証に成功。
- Terraform Stateが保護されたS3 backendを利用。
- 一般公開の `https://xiv-craftsmanship.com` にアクセスでき、WebからAPI/DBへ疎通。
- Private GHCRのイメージ配信・手動Pull・Deploy・Rollbackが動作。
- 実在した不要AWSリソースの整理結果と、残存する課金対象を確認。

## 7. 未確定事項

- AWS account/regionと既存CloudFormation stackの実在および残存リソース。
- 既存Hosted ZoneとAレコードの所有関係。
- 一般公開環境名（development/production）と新EC2のInstance Type。
- DB初期化の再現性・必要時間。

本書は実装とAWS変更の手順を定義するが、**AWSの破壊的操作を実行済みとみなさない**。
