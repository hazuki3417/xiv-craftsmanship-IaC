import { Construct } from "constructs";
import { namespace } from "./namespace";
import { XivCraftsmanshipProps } from "./type";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";

interface GitHubActionsProps extends XivCraftsmanshipProps {
	// NOTE: 必要に応じて依存するリソースの型を定義
}

export class GitHubActions extends cdk.Stack {
	constructor(scope: Construct, id: string, props: GitHubActionsProps) {
		super(scope, id, props);
		const env = props.env;
		const name = namespace({ env: env.stage, service: env.service })
			.stack.githubActions.src;
		/**
		 * GitHub Actions 用のリソース
		 */
		const oidcProvider = new iam.OpenIdConnectProvider(
			this,
			name.iam.oidc.resource.id,
			{
				url: "https://token.actions.githubusercontent.com",
				clientIds: ["sts.amazonaws.com"],
			},
		);

		/**
		 * GitHub Actions コンテナデプロイ用ロール
		 */
		const githubActionsEcrDeployRole = new iam.Role(
			this,
			name.iam.role.resource.id,
			{
				roleName: name.iam.role.resource.name,
				assumedBy: new iam.FederatedPrincipal(
					oidcProvider.openIdConnectProviderArn,
					{
						StringLike: {
							"token.actions.githubusercontent.com:sub": [
								"repo:hazuki3417/xiv-craftsmanship-web:*",
								"repo:hazuki3417/xiv-craftsmanship-api:*",
								"repo:hazuki3417/xiv-craftsmanship-db:*",
							],
						},
					},
					"sts:AssumeRoleWithWebIdentity",
				),
				description: "Role that allows GitHub Actions to access AWS resources",
			},
		);

		// ECRへのアクセスを許可するポリシーをIAMロールにアタッチ
		githubActionsEcrDeployRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				// TODO: アクセス制限・リソースの制限をちゃんと設定する
				actions: ["*"],
				resources: ["*"],
			}),
		);

		// ECRのリストを取得するためのアクセス許可も追加
		githubActionsEcrDeployRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: ["ecr:DescribeRepositories"],
				resources: ["*"],
			}),
		);

		new cdk.CfnOutput(this, name.iam.role.cfn.name.exportId, {
			value: githubActionsEcrDeployRole.roleName,
			exportName: name.iam.role.cfn.name.exportName,
		});
	}
}
