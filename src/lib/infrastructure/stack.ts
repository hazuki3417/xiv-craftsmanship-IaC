import { Construct } from "constructs";
import { XivCraftsmanshipTagType } from "../type";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as logs from "aws-cdk-lib/aws-logs";
import * as iam from "aws-cdk-lib/aws-iam";
import { namespace } from "./../namespace";

export class Infrastructure extends cdk.Stack {
	constructor(scope: Construct, id: string, props: cdk.StackProps) {
		super(scope, id, props);
		const tags = props.tags as XivCraftsmanshipTagType;
		const name = namespace({ env: tags.environment, service: tags.service });

		/***************************************************************************
		 * network
		 **************************************************************************/

		const vpc = new ec2.Vpc(
			this,
			name.stack.infrastructure.src.ec2.vpc.resource.id,
			{
				vpcName: name.stack.infrastructure.src.ec2.vpc.resource.name,
				maxAzs: 2,
			},
		);

		const sgApp = new ec2.SecurityGroup(
			this,
			name.stack.infrastructure.src.ec2.sg.resource.id,
			{
				securityGroupName: name.stack.infrastructure.src.ec2.sg.resource.name,
				vpc: vpc,
				allowAllOutbound: true,
			},
		);

		sgApp.addIngressRule(
			ec2.Peer.anyIpv4(),
			ec2.Port.tcp(80),
			"Allow HTTP traffic from anywhere",
		);
		sgApp.addIngressRule(
			ec2.Peer.ipv4("0.0.0.0/0"),
			ec2.Port.tcp(443),
			"Allow HTTPS traffic from anywhere",
		);

		vpc.addGatewayEndpoint(
			name.stack.infrastructure.src.ec2.vpc.gateway.ecr.resource.id,
			{
				service: ec2.GatewayVpcEndpointAwsService.S3,
				subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
			},
		);

		vpc.addInterfaceEndpoint(
			name.stack.infrastructure.src.ec2.vpc.interface.ecr.resource.id,
			{
				service: ec2.InterfaceVpcEndpointAwsService.ECR,
				subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
			},
		);

		vpc.addInterfaceEndpoint(
			name.stack.infrastructure.src.ec2.vpc.interface.ecrDocker.resource.id,
			{
				service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
				subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
			},
		);

		vpc.addInterfaceEndpoint(
			name.stack.infrastructure.src.ec2.vpc.interface.cloudwatchLogs.resource
				.id,
			{
				service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
				subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
			},
		);

		/***************************************************************************
		 * ecs cluster
		 **************************************************************************/

		const cluster = new ecs.Cluster(
			this,
			name.stack.infrastructure.src.ecs.cluster.resource.id,
			{
				clusterName: name.stack.infrastructure.src.ecs.cluster.resource.name,
				vpc: vpc,
			},
		);

		/***************************************************************************
		 * cloud watch logs
		 **************************************************************************/

		const logDb = new logs.LogGroup(
			this,
			name.stack.infrastructure.src.logs.logGroup.db.resource.id,
			{
				logGroupName:
					name.stack.infrastructure.src.logs.logGroup.db.resource.name,
				retention: logs.RetentionDays.ONE_WEEK,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
			},
		);

		const logApi = new logs.LogGroup(
			this,
			name.stack.infrastructure.src.logs.logGroup.api.resource.id,
			{
				logGroupName:
					name.stack.infrastructure.src.logs.logGroup.api.resource.name,
				retention: logs.RetentionDays.ONE_WEEK,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
			},
		);

		const logWeb = new logs.LogGroup(
			this,
			name.stack.infrastructure.src.logs.logGroup.web.resource.id,
			{
				logGroupName:
					name.stack.infrastructure.src.logs.logGroup.web.resource.name,
				retention: logs.RetentionDays.ONE_WEEK,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
			},
		);

		/***************************************************************************
		 * task definition
		 **************************************************************************/

		const taskExecutionRole = new iam.Role(
			this,
			name.stack.infrastructure.src.ecs.task.iam.role.resource.id,
			{
				roleName: name.stack.infrastructure.src.ecs.task.iam.role.resource.name,
				assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
				// managedPolicies: [
				//   iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
				//   iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'),
				// ],
			},
		);

		taskExecutionRole.addToPolicy(
			new iam.PolicyStatement({
				effect: iam.Effect.ALLOW,
				actions: ["*"],
				resources: ["*"],
			}),
		);

		const ecrDb = ecr.Repository.fromRepositoryAttributes(
			this,
			name.stack.ecr.src.ecr.db.cfn.arn.importId,
			{
				repositoryArn: cdk.Fn.importValue(
					name.stack.ecr.src.ecr.db.cfn.arn.exportName,
				),
				repositoryName: name.stack.ecr.src.ecr.db.resource.name,
			},
		);
		const ecrApi = ecr.Repository.fromRepositoryAttributes(
			this,
			name.stack.ecr.src.ecr.api.cfn.arn.importId,
			{
				repositoryArn: cdk.Fn.importValue(
					name.stack.ecr.src.ecr.api.cfn.arn.exportName,
				),
				repositoryName: name.stack.ecr.src.ecr.api.resource.name,
			},
		);
		const ecrWeb = ecr.Repository.fromRepositoryAttributes(
			this,
			name.stack.ecr.src.ecr.web.cfn.arn.importId,
			{
				repositoryArn: cdk.Fn.importValue(
					name.stack.ecr.src.ecr.web.cfn.arn.exportName,
				),
				repositoryName: name.stack.ecr.src.ecr.web.resource.name,
			},
		);

		const xivCraftsmanshipAppTask = new ecs.TaskDefinition(
			this,
			name.stack.infrastructure.src.ecs.task.define.app.resource.id,
			{
				compatibility: ecs.Compatibility.FARGATE,
				cpu: "1024", // Adjust based on your requirements
				memoryMiB: "2048", // Adjust based on your requirements
				executionRole: taskExecutionRole,
			},
		);

		const containerDb = xivCraftsmanshipAppTask.addContainer(
			`${tags.environment}-${tags.service}-db-container`,
			{
				image: ecs.ContainerImage.fromEcrRepository(ecrDb),
				cpu: 124,
				memoryLimitMiB: 124,
				environment: {
					POSTGRES_USER: "example",
					POSTGRES_PASSWORD: "example",
					POSTGRES_DB: "example",
				},
				portMappings: [
					{
						containerPort: 5432,
					},
				],
				logging: ecs.LogDriver.awsLogs({
					logGroup: logDb,
					streamPrefix: `${tags.environment}-${tags.service}-db`,
				}),
			},
		);

		const containerApi = xivCraftsmanshipAppTask.addContainer(
			`${tags.environment}-${tags.service}-api-container`,
			{
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
				portMappings: [
					{
						containerPort: 8080,
					},
				],
				logging: ecs.LogDriver.awsLogs({
					logGroup: logApi,
					streamPrefix: `${tags.environment}-${tags.service}-api`,
				}),
			},
		);

		const containerWeb = xivCraftsmanshipAppTask.addContainer(
			`${tags.environment}-${tags.service}-web-container`,
			{
				image: ecs.ContainerImage.fromEcrRepository(ecrWeb),
				cpu: 256,
				memoryLimitMiB: 512,
				environment: {},
				portMappings: [
					{
						containerPort: 3000,
					},
				],
				logging: ecs.LogDriver.awsLogs({
					logGroup: logWeb,
					streamPrefix: `${tags.environment}-${tags.service}-web`,
				}),
			},
		);

		const xivCraftsmanshipAppService = new ecs.FargateService(
			this,
			`${tags.environment}-${tags.service}-app-service`,
			{
				cluster: cluster,
				taskDefinition: xivCraftsmanshipAppTask,
				securityGroups: [sgApp],
				vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
				desiredCount: 1,
				deploymentController: {
					type: ecs.DeploymentControllerType.ECS,
				},
				circuitBreaker: {
					rollback: true,
					enable: true,
				},
			},
		);
	}
}
