# 旧CloudFormation/CDKからTerraformへの移行計画

ステータス: **計画案 / AWSの実リソース未確認**。Cloudへの変更と破壊的操作は行っていない。

## 1. 現行実装の棚卸し

`main` のCDKエントリーポイント `src/bin/xiv-craftsmanship.ts` は次の5 stackを構築する。

1. `XivCraftsmanship-GitHubActions`: GitHub OIDC provider / AWS IAM role。
2. `XivCraftsmanship-Ecr`: Web、API、DBのECR。
3. `XivCraftsmanship-Infrastructure`: VPC、SG、ECS cluster、ALB、Route 53、ACM、Service Discovery、CloudWatch Logs。
4. `XivCraftsmanship-DeployDataStoreService`: PostgreSQLのECS Fargate service。
5. `XivCraftsmanship-DeployAppService`: Web/APIが同じECS task内で動くFargate service、443 listenerとtarget group。

この一覧はCDKコードから読める**構築対象の宣言**であり、AWS上で現存することを意味しない。AWS account / region、CloudFormation stack statuses、live ECS/ECR/Route 53、image tags、料金発生状況は未検証。

## 2. 移行の原則

- 旧CloudFormation管理resourceをTerraformで**同時に管理しない**。同名のRoute 53 record等を二重作成しない。
- 既存CloudFormation stackの物理resourceをTerraformへ自動でImportしない。今回の新構成では単一EC2等を別resourceとして用意し、旧基盤の廃止は切替確認後に実行することを優先する。
- 継続して利用する既存Route 53 Hosted Zoneの所有関係を先に確認する。Terraformが新規Zoneを作る必要はない。既存A recordがCloudFormation所有なら削除／所有権移管時の競合、DNSの空白時間に注意する。
- 既存ECRやALBなどの削除は、CloudFormation stack間の参照・依存を確認してから行う。
- 既存システムの停止・DNS変更・旧resource削除は独立した明示承認を必要とする。Terraform Stateの破壊・旧DBの喪失を暗黙に承認されたものとしない。

## 3. 移行フェーズ案

| Phase | 実施 | 変更対象 / 判断ポイント |
| --- | --- | --- |
| 0. Inventories | AWSのread-only確認 | CloudFormation、ECS、ECR、ALB、IAM、Route 53、ACM、請求対象 |
| 1. Bootstrap | State backend準備 | State S3 bucketの新設または既存共有方針を決定、remote stateの保護確認 |
| 2. Infra | Terraform plan/apply | 新VPC/EC2/SSM/EIPなど。既存CloudFormationとの重複・DNS衝突を回避 |
| 3. Runtime | Compose・GHCRを準備 | Private Package発行、Pull認証、Caddy/Web/API/DB起動検証 |
| 4. Cutover | DNS切替 | ドメインとHTTPSを新EC2に向け、E2E検証 |
| 5. Retirement | 旧stackの順次撤去 | 依存関係・請求・復旧可否を確認した後に旧リソースを停止・廃止 |

Phase 1-5はCloudの変更を伴うため、いずれもAWS account / regionと実行者権限、影響内容の確認後に個別承認を得る。

## 4. 依存と注意点

### DNSとTLS
現在の `Infrastructure` stackは `xiv-craftsmanship.com` のHosted Zoneをlookupして、ルートA recordをALBへAliasする。新構成ではEIPへ切り替える想定だが、Terraformが同じrecordを作ろうとすれば既存管理と競合する。現在のrecord所有stack、TTL、証明書とCAAの有無、DNS切替のタイミングを棚卸しする。Caddyは80/443到達可能で初めてACMEの自動取得が成立する。

### AWS IAM / OIDC
旧OIDC providerはGitHub ActionsからECRへPushするためのRoleで、`actions: ["*"]` と `resources: ["*"]` の広い許可を含む。新構成のGHCR発行にはAWS IAM Roleを原則必要としない。EC2の管理にはSSM Roleのみを追加し、旧ProviderやRoleは既存の別用途への影響を調べてから廃止する。

### コンテナイメージ
現行Web・API・DBの `.github/workflows/deploy-to-ecr.yml` はECRへpushし、ECSサービスの更新は行わない。GHCRへの自動発行に置き換えるには各RepositoryのWorkflow変更が必要。Web/API/DBそれぞれのGHCR Package名、権限、Digest、手動deploy契約を合わせる。

### 環境構成
既存CDKの `ENVIRONMENT=development` とWorkflowの `ENVIRONMENT=develop` は用途が異なる。新Terraform rootでは環境名とpathを統一する。一般公開環境をdevelopmentとするかproductionとするかは適用前に決める。

### Stateと安全確認
Terraform backendはState専用の暗号化済みS3を用意し、versioning、bucket Public Access Block、HTTPS enforcement、Lockfileを設定する。Remote StateにはSecretを含めない。既存CloudFormation resourceのImportは実際に必要と判断したものだけに限り、意図しない二重管理を避ける。

## 5. 移行完了判定

- 新EC2でWeb/API/DB/Caddyが起動し、独立した公開アクセスのE2E試験に成功。
- DNS/HTTPSが新構成に切り替わり、外部公開ポートが意図どおり。
- Private GHCRの発行と手動Pull・Deploy・Rollbackが動作する。
- 管理対象のTerraform Stateがremoteで保護され、`plan` の意図しない差分がない。
- 旧CloudFormationの不要stack/resourceが後日確認を含めて廃止済み。
- 不要なECR/ECS/ALB/CloudWatch関連resourceが残存せず、継続費用を確認済み。

## 6. 次のレビュー論点

最優先は **AWS上の既存resourceの実在確認と、Route 53 Hosted Zone/A recordの所有関係**。次に公開環境のenvironment名、EC2 instance size、初期化データの再現性を確定する。
