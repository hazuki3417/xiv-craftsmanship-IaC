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
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";

interface DeployAppServiceProps extends XivCraftsmanshipProps {
	ecs: {
		service: {
			dataStore: ecs.FargateService;
		};
	};
	ecr: {
		api: ecr.IRepository;
		web: ecr.IRepository;
	};
	logs: {
		api: logs.ILogGroup;
		web: logs.ILogGroup;
	};
	alb: elb.ApplicationLoadBalancer;
	cluster: ecs.Cluster;
	certificate: certificatemanager.ICertificate;
	sg: {
		app: ec2.SecurityGroup;
	};
	namespace: servicediscovery.PrivateDnsNamespace;
	// NOTE: 必要に応じて依存するリソースの型を定義
}
export class DeployAppService extends cdk.Stack {
	constructor(scope: Construct, id: string, props: DeployAppServiceProps) {
		super(scope, id, props);
		const env = props.env;
		const name = namespace({ stage: env.stage, service: env.service });

		props.env;

		/***************************************************************************
		 * task definition
		 **************************************************************************/

		const taskExecutionRole = new iam.Role(
			this,
			name.stack.deployAppService.src.ecs.task.iam.role.resource.id,
			{
				roleName:
					name.stack.deployAppService.src.ecs.task.iam.role.resource.name,
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

		const task = new ecs.TaskDefinition(
			this,
			name.stack.deployAppService.src.ecs.task.define.app.resource.id,
			{
				compatibility: ecs.Compatibility.FARGATE,
				cpu: "1024", // Adjust based on your requirements
				memoryMiB: "2048", // Adjust based on your requirements
				executionRole: taskExecutionRole,
			},
		);

		// const containerWeb = task.addContainer(
		// 	`${env.stage}-${env.service}-web-container`,
		// 	{
		// 		image: ecs.ContainerImage.fromEcrRepository(props.ecr.web),
		// 		cpu: 256,
		// 		memoryLimitMiB: 512,
		// 		environment: {
		// 			API_URL: "http://localhost:8080", // NOTE: xiv-craftsmanship-apiのURL
		// 			HOST_URL: "https://xiv-craftsmanship.com",
		// 		},
		// 		portMappings: [
		// 			{
		// 				containerPort: 3000,
		// 			},
		// 		],
		// 		logging: ecs.LogDriver.awsLogs({
		// 			logGroup: props.logs.web,
		// 			streamPrefix: `${env.stage}-${env.service}-web`,
		// 		}),
		// 		healthCheck: {
		// 			command: [
		// 				"CMD-SHELL",
		// 				"wget --quiet --spider http://localhost:3000 || exit 1",
		// 			],
		// 			retries: 3,
		// 			timeout: cdk.Duration.seconds(10),
		// 			interval: cdk.Duration.seconds(30),
		// 			startPeriod: cdk.Duration.seconds(30),
		// 		},
		// 		essential: true,
		// 	},
		// );

		const containerApi = task.addContainer(
			`${env.stage}-${env.service}-api-container`,
			{
				image: ecs.ContainerImage.fromEcrRepository(props.ecr.api),
				cpu: 256,
				memoryLimitMiB: 256,
				environment: {
					STAGE: env.stage,
					PORT: "8080",
					POSTGRE_SQL_HOST: `data-store.${props.namespace.namespaceName}`,
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
					logGroup: props.logs.api,
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
				// essential: false,
			},
		);

		// タスク内のコンテナ依存を定義
		// containerWeb.addContainerDependencies({
		// 	container: containerApi,
		// 	condition: ecs.ContainerDependencyCondition.HEALTHY,
		// });

		const service = new ecs.FargateService(
			this,
			`${env.stage}-${env.service}-app-service`,
			{
				cluster: props.cluster,
				taskDefinition: task,
				securityGroups: [props.sg.app],
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
				enableExecuteCommand: true,
			},
		);

		props.ecs.service.dataStore.connections.allowFrom(
			service,
			ec2.Port.tcp(5432),
		);

		/***************************************************************************
		 * load balancer
		 **************************************************************************/

		// const listener = props.alb.addListener(
		// 	name.stack.deployAppService.src.elb.listener.web.resource.id,
		// 	{
		// 		port: 443,
		// 		certificates: [props.certificate],
		// 		open: true,
		// 	},
		// );

		// listener.addTargets(name.stack.deployAppService.src.elb.targetGroup.web.resource.id, {
		// 	port: 3000,
		// 	protocol: elb.ApplicationProtocol.HTTP,
		// 	targets: [xivCraftsmanshipAppService],
		// 	healthCheck: {
		// 		enabled: true,
		// 		path: "/",
		// 		interval: cdk.Duration.seconds(30),
		// 		timeout: cdk.Duration.seconds(5),
		// 		unhealthyThresholdCount: 2,
		// 		healthyThresholdCount: 2,
		// 	},
		// });
	}
}
