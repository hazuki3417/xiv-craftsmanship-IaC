import { Construct } from 'constructs';
import { XivCraftsmanshipTagType } from '../type';
import * as cdk from 'aws-cdk-lib';
import * as ecs  from 'aws-cdk-lib/aws-ecs';
import * as ecr  from 'aws-cdk-lib/aws-ecr';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { namespace } from './namespace';
import { namespace as ecrStackNamespace } from '../ecr/namespace';

export class EcsTaskApp extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const tags = props.tags as XivCraftsmanshipTagType;

    const name = namespace({env: tags.environment, service: tags.service});

    // /***************************************************************************
    //  * cloud watch logs
    //  **************************************************************************/
    const logDb = new logs.LogGroup(this, name.logs.logGroup.db.resource.id, {
      logGroupName: name.logs.logGroup.db.resource.name,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const logApi = new logs.LogGroup(this, name.logs.logGroup.api.resource.id, {
      logGroupName: name.logs.logGroup.api.resource.name,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const logWeb = new logs.LogGroup(this, name.logs.logGroup.web.resource.id, {
      logGroupName: name.logs.logGroup.web.resource.name,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    const taskExecutionRole = new iam.Role(this, name.ecs.task.iam.role.resource.id, {
      roleName: name.ecs.task.iam.role.resource.name,
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      // managedPolicies: [
      //   iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      //   iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
      // ],
    });
    taskExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "*",
      ],
      resources: [
        "*",
      ],
    }));

    const ecrStackName = ecrStackNamespace({env: tags.environment, service: tags.service});
    const ecrDb = ecr.Repository.fromRepositoryAttributes(this, ecrStackName.ecr.db.resource.id, {
      repositoryArn: cdk.Fn.importValue(ecrStackName.ecr.db.cfn.arn.export),
      repositoryName: ecrStackName.ecr.db.resource.name,
    })
    const ecrApi = ecr.Repository.fromRepositoryAttributes(this, ecrStackName.ecr.api.resource.id, {
      repositoryArn: cdk.Fn.importValue(ecrStackName.ecr.api.cfn.arn.export),
      repositoryName: ecrStackName.ecr.api.resource.name,
    })
    const ecrWeb = ecr.Repository.fromRepositoryAttributes(this, ecrStackName.ecr.web.resource.id, {
      repositoryArn: cdk.Fn.importValue(ecrStackName.ecr.web.cfn.arn.export),
      repositoryName: ecrStackName.ecr.web.resource.name,
    })

    const xivCraftsmanshipAppTask = new ecs.TaskDefinition(this, name.ecs.task.define.app.resource.id, {
      compatibility: ecs.Compatibility.FARGATE,
      cpu: '1024', // Adjust based on your requirements
      memoryMiB: '2048', // Adjust based on your requirements
      executionRole: taskExecutionRole
    })

    // const containerDb = xivCraftsmanshipAppTask.addContainer(`${tags.environment}-${tags.service}-db-container`, {
    //   image: ecs.ContainerImage.fromEcrRepository(ecrDb),
    //   cpu: 124,
    //   memoryLimitMiB: 124,
    //   environment: {
    //     POSTGRES_USER: 'example',
    //     POSTGRES_PASSWORD: 'example',
    //     POSTGRES_DB: 'example',
    //   },
    //   // portMappings: [{
    //   //   containerPort: 5432,
    //   // }],
    //   logging: ecs.LogDriver.awsLogs({
    //     logGroup: logDb,
    //     streamPrefix: `${tags.environment}-${tags.service}-db`,
    //   }),
    // })

    // const containerApi = xivCraftsmanshipAppTask.addContainer(`${tags.environment}-${tags.service}-api-container`, {
    //   image: ecs.ContainerImage.fromEcrRepository(ecrApi),
    //   cpu: 256,
    //   memoryLimitMiB: 256,
    //   environment: {
    //     ENV: tags.environment,
    //     PORT: "8080",
    //     POSTGRE_SQL_HOST: "localhost",
    //     POSTGRE_SQL_USERNAME: "example",
    //     POSTGRE_SQL_PASSWORD: "example",
    //     POSTGRE_SQL_DB: "example",
    //   },
    //   // portMappings: [{
    //   //   containerPort: 8080,
    //   // }],
    //   logging: ecs.LogDriver.awsLogs({
    //     logGroup: logApi,
    //     streamPrefix: `${tags.environment}-${tags.service}-api`,
    //   }),
    // })

    const containerWeb = xivCraftsmanshipAppTask.addContainer(`${tags.environment}-${tags.service}-web-container`, {
      image: ecs.ContainerImage.fromEcrRepository(ecrWeb),
      cpu: 256,
      memoryLimitMiB: 512,
      environment: {
      },
      portMappings: [{
        containerPort: 3000,
      }],
      logging: ecs.LogDriver.awsLogs({
        logGroup: logWeb,
        streamPrefix: `${tags.environment}-${tags.service}-web`,
      }),
    })
  }
}
