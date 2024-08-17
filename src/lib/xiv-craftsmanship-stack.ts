import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { XivCraftsmanshipTagType } from './type';

export class XivCraftsmanshipStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const tags = props.tags as XivCraftsmanshipTagType;


    /**
     * ECR リソース
     */
    const ecrWeb = new ecr.Repository(this, `${tags.environment}-EcrRepositoryWeb`, {
      repositoryName: `${tags.environment}-${tags.service}-web`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ecrApi = new ecr.Repository(this, `${tags.environment}-EcrRepositoryApi`, {
      repositoryName: `${tags.environment}-${tags.service}-api`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ecrDb = new ecr.Repository(this, `${tags.environment}-EcrRepositoryDb`, {
      repositoryName: `${tags.environment}-${tags.service}-db`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    ecrWeb.addLifecycleRule({ maxImageCount: 5 });
    ecrApi.addLifecycleRule({ maxImageCount: 5 });
    ecrDb.addLifecycleRule({ maxImageCount: 5 });

    /**
     * GitHub Actions 用のリソース
     */
    const oidcProvider = new iam.OpenIdConnectProvider(this, `${tags.environment}-GitHubActionsProvider`, {
      url: 'https://token.actions.githubusercontent.com',
      clientIds: ['sts.amazonaws.com'],
    });

    /**
     * GitHub Actions コンテナデプロイ用ロール
     */
    const githubActionsEcrDeployRole = new iam.Role(this, `${tags.environment}-GitHubActionsEcrDeployRole`, {
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
      actions: [
        'ecr:GetDownloadUrlForLayer',
        'ecr:BatchGetImage',
        'ecr:CompleteLayerUpload',
        'ecr:UploadLayerPart',
        'ecr:InitiateLayerUpload',
        'ecr:PutImage',
        'ecr:GetAuthorizationToken'
      ],
      resources: [
        ecrWeb.repositoryArn,
        ecrApi.repositoryArn,
        ecrDb.repositoryArn,
      ],
    }));

    // ECRのリストを取得するためのアクセス許可も追加
    githubActionsEcrDeployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ecr:DescribeRepositories'],
      resources: ['*'],
    }));
  }
}
