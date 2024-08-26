import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { XivCraftsmanshipTagType } from '../type';
import { namespace } from './namespace';

export class GitHubActions extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const tags = props.tags as XivCraftsmanshipTagType;

    const name = namespace({env: tags.environment, service: tags.service});
    /**
     * GitHub Actions 用のリソース
     */
    const oidcProvider = new iam.OpenIdConnectProvider(this, name.iam.oidc.resource.id, {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    /**
     * GitHub Actions コンテナデプロイ用ロール
     */
    const githubActionsEcrDeployRole = new iam.Role(this, name.iam.role.resource.id, {
      roleName: name.iam.role.resource.name,
      assumedBy: new iam.FederatedPrincipal(
        oidcProvider.openIdConnectProviderArn,
        {
          StringLike: {
            'token.actions.githubusercontent.com:sub': [
              'repo:hazuki3417/xiv-craftsmanship-web:*',
              'repo:hazuki3417/xiv-craftsmanship-api:*',
              'repo:hazuki3417/xiv-craftsmanship-db:*',
            ]
          }
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
      description: 'Role that allows GitHub Actions to access AWS resources',
    });

    // ECRへのアクセスを許可するポリシーをIAMロールにアタッチ
    githubActionsEcrDeployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      // TODO: アクセス制限・リソースの制限をちゃんと設定する
      actions: [
        "*"
      ],
      resources: [
        "*"
      ],
    }));

    // ECRのリストを取得するためのアクセス許可も追加
    githubActionsEcrDeployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ecr:DescribeRepositories'],
      resources: ['*'],
    }));

    new cdk.CfnOutput(this, name.iam.role.cfn.name.id, {
      value: githubActionsEcrDeployRole.roleName,
      exportName: name.iam.role.cfn.name.export,
    });
  }
}
