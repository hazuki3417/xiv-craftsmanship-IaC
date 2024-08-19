import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import { XivCraftsmanshipTagType } from './type';
import { InstanceClass, InstanceSize, InstanceType, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, Ec2Service, Ec2TaskDefinition } from 'aws-cdk-lib/aws-ecs';

export class XivCraftsmanshipStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const tags = props.tags as XivCraftsmanshipTagType;

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



    /***************************************************************************
     * ecr
     **************************************************************************/

    const ecrDb = new ecr.Repository(this, `${tags.environment}-EcrRepositoryDb`, {
      repositoryName: `${tags.environment}-${tags.service}-db`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ecrApi = new ecr.Repository(this, `${tags.environment}-EcrRepositoryApi`, {
      repositoryName: `${tags.environment}-${tags.service}-api`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ecrWeb = new ecr.Repository(this, `${tags.environment}-EcrRepositoryWeb`, {
      repositoryName: `${tags.environment}-${tags.service}-web`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    ecrDb.addLifecycleRule({ maxImageCount: 5 });
    ecrApi.addLifecycleRule({ maxImageCount: 5 });
    ecrWeb.addLifecycleRule({ maxImageCount: 5 });



    /***************************************************************************
     * network
     **************************************************************************/

    const vpc = new Vpc(this, `${tags.environment}-Vpc`, {
      maxAzs: 2,
    });

    const sgDb = new SecurityGroup(this, `${tags.environment}-SecurityGroupDb`, {
      vpc:vpc,
      description: 'allow api access to db',
      allowAllOutbound: true,
    });

    const sgApi = new SecurityGroup(this, `${tags.environment}-SecurityGroupApi`, {
      vpc:vpc,
      description: 'allow outbound access to DB',
      allowAllOutbound: true,
    });

    const sgWeb = new SecurityGroup(this, `${tags.environment}-SecurityGroupWeb`, {
      vpc:vpc,
      allowAllOutbound: true,
    });
    sgDb.addIngressRule(sgApi, Port.tcp(5432), 'allow api to connect to db');


    /***************************************************************************
     * ecs cluster
     **************************************************************************/

    const cluster = new Cluster(this, `${tags.environment}-Cluster`, {
      vpc: vpc,
    })

    cluster.addCapacity(`${tags.environment}-Capacity`, {
      instanceType: new InstanceType(`${InstanceClass.T2}.${InstanceSize.MICRO}`),
      vpcSubnets: { subnetType: SubnetType.PUBLIC},
    })

    /***************************************************************************
     * db
     **************************************************************************/

    const xivCraftsmanshipDbTask = new Ec2TaskDefinition(this, `${tags.environment}-${tags.service}-db`)
    xivCraftsmanshipDbTask.addContainer(`${tags.environment}-${tags.service}-db-container`, {
      image: ContainerImage.fromEcrRepository(ecrDb),
      cpu: 124,
      memoryLimitMiB: 124,
      environment: {
        POSTGRES_USER: 'example',
        POSTGRES_PASSWORD: 'example',
        POSTGRES_DB: 'example',
      },
      portMappings: [{
        // TODO: cloud mapなどを使って接続できるようにする
        containerPort: 5432,
        hostPort: 5432,
      }]
    })

   const xivCraftsmanshipDbService = new Ec2Service(this, `${tags.environment}-${tags.service}-db-service`, {
      cluster: cluster,
      taskDefinition: xivCraftsmanshipDbTask,
      daemon: true,
      // securityGroups: [sgDb],
    })



    /***************************************************************************
     * api
     **************************************************************************/

    const xivCraftsmanshipApiTask = new Ec2TaskDefinition(this, `${tags.environment}-${tags.service}-api`)
    xivCraftsmanshipApiTask.addContainer(`${tags.environment}-${tags.service}-api-container`, {
      image: ContainerImage.fromEcrRepository(ecrApi),
      cpu: 124,
      memoryLimitMiB: 256,
      environment: {
        DB_HOST: xivCraftsmanshipDbService.serviceName,
        Environment: tags.environment,
        Port: "8080",
        PostgreSqlHost: `${xivCraftsmanshipDbService.serviceName}:5432`,
        PostgreSqlUsername: "example",
        PostgreSqlPassword: "example",
        PostgreSqlDb: "example",
      }
    })

    // const xivCraftsmanshipApiService = new Ec2Service(this, `${tags.environment}-${tags.service}-api-service`, {
    //   cluster: cluster,
    //   taskDefinition: xivCraftsmanshipApiTask,
    //   daemon: true,
    //   securityGroups: [sgApi],
    // })

    /***************************************************************************
     * web
     **************************************************************************/

    const xivCraftsmanshipWebTask = new Ec2TaskDefinition(this, `${tags.environment}-${tags.service}-web`)
    xivCraftsmanshipWebTask.addContainer(`${tags.environment}-${tags.service}-web-container`, {
      image: ContainerImage.fromEcrRepository(ecrWeb),
      cpu: 256,
      memoryLimitMiB: 512,
      environment: {
      }
    })


    const xivCraftsmanshipWebService = new Ec2Service(this, `${tags.environment}-${tags.service}-web-service`, {
      cluster: cluster,
      taskDefinition: xivCraftsmanshipWebTask,
      daemon: true,
      // securityGroups: [sgWeb],
    })

  }
}
