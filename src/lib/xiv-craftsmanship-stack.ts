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

    const sgApi = new ec2.SecurityGroup(this, `${tags.environment}-SecurityGroupApi`, {
      vpc:vpc,
      allowAllOutbound: true,
    });

    const sgWeb = new ec2.SecurityGroup(this, `${tags.environment}-SecurityGroupWeb`, {
      vpc:vpc,
      allowAllOutbound: true,
    });
    // sgDb.addIngressRule(sgApi, Port.tcp(5432), 'allow api to connect to db');

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

    /**
     * service discoveryを用いて名前によるサービス間通信を実現する
     */
    const namespace = cluster.addDefaultCloudMapNamespace({
      name: `${tags.environment}.${tags.service}`
    })


    /***************************************************************************
     * db
     **************************************************************************/

    const xivCraftsmanshipApiTask = new ecs.TaskDefinition(this, `${tags.environment}-${tags.service}-api`, {
      compatibility: ecs.Compatibility.EC2,
      networkMode: ecs.NetworkMode.AWS_VPC,
    })

    xivCraftsmanshipApiTask.addContainer(`${tags.environment}-${tags.service}-db-container`, {
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
      })
    })

    xivCraftsmanshipApiTask.addContainer(`${tags.environment}-${tags.service}-api-container`, {
      image: ecs.ContainerImage.fromEcrRepository(ecrApi),
      cpu: 256,
      memoryLimitMiB: 256,
      environment: {
        ENV: tags.environment,
        PORT: "8080",
        POSTGRE_SQL_HOST: "localhost:5432",
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

    /***************************************************************************
     * web
     **************************************************************************/

    const xivCraftsmanshipWebTask = new ecs.TaskDefinition(this, `${tags.environment}-${tags.service}-web`, {
      compatibility: ecs.Compatibility.EC2,
      networkMode: ecs.NetworkMode.AWS_VPC,
    })
    xivCraftsmanshipWebTask.addContainer(`${tags.environment}-${tags.service}-web-container`, {
      image: ecs.ContainerImage.fromEcrRepository(ecrWeb),
      cpu: 256,
      memoryLimitMiB: 512,
      environment: {
      },
      logging: ecs.LogDriver.awsLogs({
        logGroup: logWeb,
        streamPrefix: `${tags.environment}-${tags.service}-web`,
      })
    })



    /***************************************************************************
     * deploy
     **************************************************************************/

    // const xivCraftsmanshipApiService = new ecs.Ec2Service(this, `${tags.environment}-${tags.service}-api-service`, {
    //   cluster: cluster,
    //   taskDefinition: xivCraftsmanshipApiTask,
    //   daemon: true,
    //   securityGroups: [sgApi],
    //   vpcSubnets: {
    //     subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
    //   },
    //   cloudMapOptions: {
    //     name: `api`,
    //     cloudMapNamespace: namespace,
    //   },
    //   // circuitBreaker: {
    //   //   enable: true,
    //   //   rollback: true,
    //   // }
    // })


    const xivCraftsmanshipWebService = new ecs.Ec2Service(this, `${tags.environment}-${tags.service}-web-service`, {
      cluster: cluster,
      taskDefinition: xivCraftsmanshipWebTask,
      daemon: true,
      securityGroups: [sgWeb],
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      cloudMapOptions: {
        name: `web`,
        cloudMapNamespace: namespace,
      },
      circuitBreaker: {
        enable: true,
        rollback: true,
      }
    })
  }
}
