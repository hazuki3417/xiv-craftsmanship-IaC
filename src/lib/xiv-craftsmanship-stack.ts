import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { XivCraftsmanshipTagType } from './type';
import { InstanceClass, InstanceSize, InstanceType, Port, SecurityGroup, SubnetType, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Cluster, ContainerImage, Ec2Service, Ec2TaskDefinition, LogDriver, NetworkMode } from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';

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

    const cluster = new Cluster(this, `${tags.environment}-Cluster`, {
      vpc: vpc,
    })


    /**
     * NOTE: t2.microはENIの数が2つ。aws vpcモードを利用するとすぐに枯渇するので、t3a.mediumを利用している。
     *       ランニングコストが高かったらネットワークモードをbrideにして、1つのサービスで稼働させる方法を検討する。
     */

    cluster.addCapacity(`${tags.environment}-Capacity`, {
      instanceType: new InstanceType(`${InstanceClass.T3A}.${InstanceSize.MEDIUM}`),
      vpcSubnets: { subnetType: SubnetType.PUBLIC},
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

    const xivCraftsmanshipDbTask = new Ec2TaskDefinition(this, `${tags.environment}-${tags.service}-db`, {
      networkMode: NetworkMode.AWS_VPC
    })
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
        // hostPort: 5432,
      }],
      logging: LogDriver.awsLogs({
        logGroup: logDb,
        streamPrefix: `${tags.environment}-${tags.service}-db`,
      })
    })

   const xivCraftsmanshipDbService = new Ec2Service(this, `${tags.environment}-${tags.service}-db-service`, {
      cluster: cluster,
      taskDefinition: xivCraftsmanshipDbTask,
      daemon: true,
      securityGroups: [sgDb],
      cloudMapOptions: {
        name: `db`,
        cloudMapNamespace: namespace,
      },
      circuitBreaker: {
        enable: true,
        rollback: true,
      }
    })



    /***************************************************************************
     * api
     **************************************************************************/

    const xivCraftsmanshipApiTask = new Ec2TaskDefinition(this, `${tags.environment}-${tags.service}-api`, {
      networkMode: NetworkMode.AWS_VPC
    })
    xivCraftsmanshipApiTask.addContainer(`${tags.environment}-${tags.service}-api-container`, {
      image: ContainerImage.fromEcrRepository(ecrApi),
      cpu: 256,
      memoryLimitMiB: 256,
      environment: {
        ENV: tags.environment,
        PORT: "8080",
        // `${tags.service}-db`.${tags.environment}.local
        POSTGRE_SQL_HOST: `${xivCraftsmanshipDbService.cloudMapService!.serviceName}.${namespace.namespaceName}`,
        POSTGRE_SQL_USERNAME: "example",
        POSTGRE_SQL_PASSWORD: "example",
        POSTGRE_SQL_DB: "example",
      },
      portMappings: [{
      //   // TODO: cloud mapなどを使って接続できるようにする
        containerPort: 8080,
      //   hostPort: 8080,
      }],
      logging: LogDriver.awsLogs({
        logGroup: logApi,
        streamPrefix: `${tags.environment}-${tags.service}-api`,
      })
    })

    // const xivCraftsmanshipApiService = new Ec2Service(this, `${tags.environment}-${tags.service}-api-service`, {
    //   cluster: cluster,
    //   taskDefinition: xivCraftsmanshipApiTask,
    //   daemon: true,
    //   securityGroups: [sgApi],
    //   cloudMapOptions: {
    //     name: `${tags.service}-api`,
    //     cloudMapNamespace: namespace,
    //   },
    //   circuitBreaker: {
    //     enable: true,
    //     rollback: true,
    //   }
    // })

    /***************************************************************************
     * web
     **************************************************************************/

    const xivCraftsmanshipWebTask = new Ec2TaskDefinition(this, `${tags.environment}-${tags.service}-web`, {
      networkMode: NetworkMode.AWS_VPC
    })
    xivCraftsmanshipWebTask.addContainer(`${tags.environment}-${tags.service}-web-container`, {
      image: ContainerImage.fromEcrRepository(ecrWeb),
      cpu: 256,
      memoryLimitMiB: 512,
      environment: {
      },
      logging: LogDriver.awsLogs({
        logGroup: logWeb,
        streamPrefix: `${tags.environment}-${tags.service}-web`,
      })
    })

    const xivCraftsmanshipWebService = new Ec2Service(this, `${tags.environment}-${tags.service}-web-service`, {
      cluster: cluster,
      taskDefinition: xivCraftsmanshipWebTask,
      daemon: true,
      securityGroups: [sgWeb],
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
