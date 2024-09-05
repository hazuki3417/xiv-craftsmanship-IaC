import { Construct } from "constructs";
import { namespace } from "./namespace";
import { XivCraftsmanshipProps } from "./type";
import * as cdk from "aws-cdk-lib";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";

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

		const containerWeb = xivCraftsmanshipAppTask.addContainer(
			`${env.stage}-${env.service}-web-container`,
			{
				image: ecs.ContainerImage.fromEcrRepository(ecrWeb),
				cpu: 256,
				memoryLimitMiB: 512,
				environment: {
					API_URL: "http://localhost:8080", // NOTE: xiv-craftsmanship-apiのURL
					HOST_URL: "https://xiv-craftsmanship.com",
				},
				portMappings: [
					{
						containerPort: 3000,
					},
				],
				logging: ecs.LogDriver.awsLogs({
					logGroup: logWeb,
					streamPrefix: `${env.stage}-${env.service}-web`,
				}),
				healthCheck: {
					command: [
						"CMD-SHELL",
						"wget --quiet --spider http://localhost:3000 || exit 1",
					],
					retries: 3,
					timeout: cdk.Duration.seconds(10),
					interval: cdk.Duration.seconds(30),
					startPeriod: cdk.Duration.seconds(30),
				},
			},
		);

		const containerApi = xivCraftsmanshipAppTask.addContainer(
			`${env.stage}-${env.service}-api-container`,
			{
				image: ecs.ContainerImage.fromEcrRepository(ecrApi),
				cpu: 256,
				memoryLimitMiB: 256,
				environment: {
					STAGE: env.stage,
					PORT: "8080",
					POSTGRE_SQL_HOST: "localhost:5555",
					POSTGRE_SQL_USERNAME: "example",
					POSTGRE_SQL_PASSWORD: "example",
					POSTGRE_SQL_DB: "example",
				},
				portMappings: [],
				logging: ecs.LogDriver.awsLogs({
					logGroup: logApi,
					streamPrefix: `${env.stage}-${env.service}-api`,
				}),
				healthCheck: {
					command: [
						"CMD-SHELL",
						"wget --quiet --spider http://localhost:8080/health || exit 1",
					],
					retries: 3,
					timeout: cdk.Duration.seconds(10),
					interval: cdk.Duration.seconds(30),
					startPeriod: cdk.Duration.seconds(30),
				},
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
				portMappings: [],
				logging: ecs.LogDriver.awsLogs({
					logGroup: logDb,
					streamPrefix: `${env.stage}-${env.service}-db`,
				}),
				healthCheck: {
					command: ["CMD-SHELL", "pg_isready -U postgres || exit 1"],
					retries: 5,
					timeout: cdk.Duration.seconds(5),
					interval: cdk.Duration.seconds(10),
					startPeriod: cdk.Duration.seconds(30),
				},
			},
		);

		const xivCraftsmanshipAppService = new ecs.FargateService(
			this,
			`${env.stage}-${env.service}-app-service`,
			{
				cluster: cluster,
				taskDefinition: xivCraftsmanshipAppTask,
				securityGroups: [sgApp],
				vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
				desiredCount: 1,
				assignPublicIp: true,
				deploymentController: {
					type: ecs.DeploymentControllerType.ECS,
				},
				circuitBreaker: {
					rollback: true,
					enable: true,
				},
			},
		);

		/***************************************************************************
		 * domain
		 **************************************************************************/
		const zone = route53.HostedZone.fromLookup(
			this,
			name.stack.infrastructure.src.route53.zone.resource.id,
			{
				domainName: env.host,
			},
		);

		const certificate = new certificatemanager.Certificate(
			this,
			name.stack.infrastructure.src.certificatemanager.certificate.resource.id,
			{
				domainName: env.host,
				validation: certificatemanager.CertificateValidation.fromDns(zone),
			},
		);

		/***************************************************************************
		 * load balancer
		 **************************************************************************/

		const alb = new elb.ApplicationLoadBalancer(
			this,
			name.stack.infrastructure.src.elb.loadBalancer.resource.id,
			{
				vpc: vpc,
				internetFacing: true,
				securityGroup: sgApp,
			},
		);

		const listener = alb.addListener(
			name.stack.infrastructure.src.elb.listener.web.resource.id,
			{
				port: 443,
				certificates: [certificate],
				open: true,
			},
		);

		alb.addRedirect({
			sourcePort: 80,
			sourceProtocol: elb.ApplicationProtocol.HTTP,
			targetPort: 443,
			targetProtocol: elb.ApplicationProtocol.HTTPS,
		});

		listener.addTargets(
			name.stack.infrastructure.src.elb.targetGroup.web.resource.id,
			{
				port: 3000,
				protocol: elb.ApplicationProtocol.HTTP,
				targets: [xivCraftsmanshipAppService],
				healthCheck: {
					enabled: true,
					path: "/",
					interval: cdk.Duration.seconds(30),
					timeout: cdk.Duration.seconds(5),
					unhealthyThresholdCount: 2,
					healthyThresholdCount: 2,
				},
			},
		);

		const record = new route53.ARecord(
			this,
			name.stack.infrastructure.src.route53.record.web.resource.id,
			{
				zone: zone,
				target: route53.RecordTarget.fromAlias(
					new targets.LoadBalancerTarget(alb),
				),
				// NOTE: ルートドメインの場合は空、サブドメインの場合はサブドメインだけを指定
				recordName: "",
			},
		);

		new cdk.CfnOutput(
			this,
			name.stack.infrastructure.src.route53.record.web.cfn.dns.exportId,
			{
				value: record.domainName,
				description: "The domain name for the ALB",
			},
		);
	}
}
