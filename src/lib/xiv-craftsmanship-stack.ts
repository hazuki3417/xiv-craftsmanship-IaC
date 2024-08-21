import { Construct } from 'constructs';
import { XivCraftsmanshipTagType } from './type';
import * as cdk from 'aws-cdk-lib';
import * as ec2  from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs  from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';

export class XivCraftsmanshipStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const tags = props.tags as XivCraftsmanshipTagType;

    /***************************************************************************
     * ecr
     **************************************************************************/

    const ecrDb = new ecr.Repository(this, `${tags.environment}-EcrRepositoryDb`, {
      repositoryName: `${tags.environment}-${tags.service}-db`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const ecrApi = new ecr.Repository(this, `${tags.environment}-EcrRepositoryApi`, {
      repositoryName: `${tags.environment}-${tags.service}-api`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const ecrWeb = new ecr.Repository(this, `${tags.environment}-EcrRepositoryWeb`, {
      repositoryName: `${tags.environment}-${tags.service}-web`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    ecrDb.addLifecycleRule({ maxImageCount: 5 });
    ecrApi.addLifecycleRule({ maxImageCount: 5 });
    ecrWeb.addLifecycleRule({ maxImageCount: 5 });



    /***************************************************************************
     * network
     **************************************************************************/

    const vpc = new ec2.Vpc(this, `${tags.environment}-Vpc`, {
      maxAzs: 2,
    });

    const sgApp = new ec2.SecurityGroup(this, `${tags.environment}-SecurityGroupApp`, {
      vpc:vpc,
      allowAllOutbound: true,
    });

    sgApp.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere');

    /***************************************************************************
     * cloud watch logs
     **************************************************************************/
    const logDb = new logs.LogGroup(this, `${tags.environment}-${tags.service}-db-log`, {
      logGroupName: `/ecs/${tags.environment}-${tags.service}-db`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const logApi = new logs.LogGroup(this, `${tags.environment}-${tags.service}-api-log`, {
      logGroupName: `/ecs/${tags.environment}-${tags.service}-api`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const logWeb = new logs.LogGroup(this, `${tags.environment}-${tags.service}-web-log`, {
      logGroupName: `/ecs/${tags.environment}-${tags.service}-web`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    /***************************************************************************
     * ecs cluster
     **************************************************************************/

    const cluster = new ecs.Cluster(this, `${tags.environment}-Cluster`, {
      vpc: vpc,
    })


    /**
     * NOTE: t2.microはENIの数が2つ。aws vpcモードを利用するとすぐに枯渇するので、t3a.mediumを利用している。
     *       ランニングコストが高かったらネットワークモードをbrideにして、1つのサービスで稼働させる方法を検討する。
     */

    cluster.addCapacity(`${tags.environment}-Capacity`, {
      instanceType: new ec2.InstanceType(`${ec2.InstanceClass.T3A}.${ec2.InstanceSize.MEDIUM}`),
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC},
    })

    /***************************************************************************
     * db
     **************************************************************************/

    const xivCraftsmanshipAppTask = new ecs.TaskDefinition(this, `${tags.environment}-${tags.service}-app`, {
      compatibility: ecs.Compatibility.EC2,
      networkMode: ecs.NetworkMode.BRIDGE,
    })

    const containerDb = xivCraftsmanshipAppTask.addContainer(`${tags.environment}-${tags.service}-db-container`, {
      image: ecs.ContainerImage.fromEcrRepository(ecrDb),
      cpu: 124,
      memoryLimitMiB: 124,
      environment: {
        POSTGRES_USER: 'example',
        POSTGRES_PASSWORD: 'example',
        POSTGRES_DB: 'example',
      },
      portMappings: [{
        containerPort: 5432,
      }],
      logging: ecs.LogDriver.awsLogs({
        logGroup: logDb,
        streamPrefix: `${tags.environment}-${tags.service}-db`,
      }),
    })

    const containerApi = xivCraftsmanshipAppTask.addContainer(`${tags.environment}-${tags.service}-api-container`, {
      image: ecs.ContainerImage.fromEcrRepository(ecrApi),
      cpu: 256,
      memoryLimitMiB: 256,
      environment: {
        ENV: tags.environment,
        PORT: "8080",
        POSTGRE_SQL_HOST: "localhost",
        POSTGRE_SQL_USERNAME: "example",
        POSTGRE_SQL_PASSWORD: "example",
        POSTGRE_SQL_DB: "example",
      },
      portMappings: [{
        containerPort: 8080,
      }],
      logging: ecs.LogDriver.awsLogs({
        logGroup: logApi,
        streamPrefix: `${tags.environment}-${tags.service}-api`,
      }),
    })

    const containerWeb = xivCraftsmanshipAppTask.addContainer(`${tags.environment}-${tags.service}-web-container`, {
      image: ecs.ContainerImage.fromEcrRepository(ecrWeb),
      cpu: 256,
      memoryLimitMiB: 512,
      environment: {
      },
      portMappings: [{
        containerPort: 3000,
        hostPort: 80,
      }],
      logging: ecs.LogDriver.awsLogs({
        logGroup: logWeb,
        streamPrefix: `${tags.environment}-${tags.service}-web`,
      })
    })


    /***************************************************************************
     * deploy
     **************************************************************************/

    const xivCraftsmanshipAppService = new ecs.Ec2Service(this, `${tags.environment}-${tags.service}-app-service`, {
      cluster: cluster,
      taskDefinition: xivCraftsmanshipAppTask,
      daemon: true,
      circuitBreaker: {
        enable: true,
        rollback: true,
      }
    })
  }
}
