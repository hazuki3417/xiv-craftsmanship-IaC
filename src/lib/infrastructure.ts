import { Construct } from "constructs";
import { namespace } from "./namespace";
import { XivCraftsmanshipProps } from "./type";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
interface InfrastructureProps extends XivCraftsmanshipProps {
	// NOTE: 必要に応じて依存するリソースの型を定義
}
export class Infrastructure extends cdk.Stack {
	constructor(scope: Construct, id: string, props: InfrastructureProps) {
		super(scope, id, props);
		const env = props.env;
		const name = namespace({ stage: env.stage, service: env.service });

		props.env;

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
			ec2.Peer.anyIpv4(),
			ec2.Port.tcp(443),
			"Allow HTTPS traffic from anywhere",
		);

		vpc.addGatewayEndpoint(
			name.stack.infrastructure.src.ec2.vpc.gateway.ecr.resource.id,
			{
				service: ec2.GatewayVpcEndpointAwsService.S3,
				subnets: [{ subnetType: ec2.SubnetType.PUBLIC }],
			},
		);

		vpc.addInterfaceEndpoint(
			name.stack.infrastructure.src.ec2.vpc.interface.ecr.resource.id,
			{
				service: ec2.InterfaceVpcEndpointAwsService.ECR,
				subnets: { subnetType: ec2.SubnetType.PUBLIC },
			},
		);

		vpc.addInterfaceEndpoint(
			name.stack.infrastructure.src.ec2.vpc.interface.ecrDocker.resource.id,
			{
				service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
				subnets: { subnetType: ec2.SubnetType.PUBLIC },
			},
		);

		vpc.addInterfaceEndpoint(
			name.stack.infrastructure.src.ec2.vpc.interface.cloudwatchLogs.resource
				.id,
			{
				service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
				subnets: { subnetType: ec2.SubnetType.PUBLIC },
			},
		);

		// /***************************************************************************
		//  * load balancer
		//  **************************************************************************/
		// const alb = new elb.ApplicationLoadBalancer(
		// 	this,
		// 	name.stack.infrastructure.src.elb.loadBalancer.resource.id,
		// 	{
		// 		vpc: vpc,
		// 		internetFacing: true,
		// 		securityGroup: sgApp,
		// 	},
		// );

		// // ALBのリスナーを作成
		// const listener = alb.addListener(
		// 	name.stack.infrastructure.src.elb.listener.web.resource.id,
		// 	{
		// 		port: 80,
		// 		open: true,
		// 	},
		// );

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
			`${env.stage}-${env.service}-db-container`,
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
					streamPrefix: `${env.stage}-${env.service}-db`,
				}),
			},
		);

		const containerApi = xivCraftsmanshipAppTask.addContainer(
			`${env.stage}-${env.service}-api-container`,
			{
				image: ecs.ContainerImage.fromEcrRepository(ecrApi),
				cpu: 256,
				memoryLimitMiB: 256,
				environment: {
					ENV: env.stage,
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
					streamPrefix: `${env.stage}-${env.service}-api`,
				}),
			},
		);

		const containerWeb = xivCraftsmanshipAppTask.addContainer(
			`${env.stage}-${env.service}-web-container`,
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
					streamPrefix: `${env.stage}-${env.service}-web`,
				}),
			},
		);

		// const xivCraftsmanshipAppService = new ecs.FargateService(
		// 	this,
		// 	`${env.stage}-${env.service}-app-service`,
		// 	{
		// 		cluster: cluster,
		// 		taskDefinition: xivCraftsmanshipAppTask,
		// 		securityGroups: [sgApp],
		// 		vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
		// 		desiredCount: 1,
		// 		assignPublicIp: true,
		// 		deploymentController: {
		// 			type: ecs.DeploymentControllerType.ECS,
		// 		},
		// 		circuitBreaker: {
		// 			rollback: true,
		// 			enable: true,
		// 		},
		// 	},
		// );

		// // ターゲットグループの作成
		// const targetGroup = new elb.ApplicationTargetGroup(
		// 	this,
		// 	name.stack.infrastructure.src.elb.targetGroup.web.resource.id,
		// 	{
		// 		vpc: vpc,
		// 		port: 80,
		// 		targets: [xivCraftsmanshipAppService],
		// 	},
		// );

		// // リスナーにターゲットグループを追加
		// listener.addTargetGroups(
		// 	name.stack.infrastructure.src.elb.listenerTargetGroup.web.resource.id,
		// 	{
		// 		targetGroups: [targetGroup],
		// 	},
		// );

		// // 出力
		// new cdk.CfnOutput(
		// 	this,
		// 	name.stack.infrastructure.src.elb.loadBalancer.cfn.dns.importId,
		// 	{
		// 		value: alb.loadBalancerDnsName,
		// 		description: "The DNS name of the ALB",
		// 	},
		// );
	}
}
