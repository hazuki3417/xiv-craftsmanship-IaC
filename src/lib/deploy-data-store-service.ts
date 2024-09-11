import { Construct } from "constructs";
import { namespace } from "./namespace";
import { XivCraftsmanshipProps } from "./type";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as servicediscovery from 'aws-cdk-lib/aws-servicediscovery';

interface DeployDataStoreServiceProps extends XivCraftsmanshipProps {
	ecr: {
		db: ecr.IRepository;
	};
	logs: {
		db: logs.ILogGroup;
	};
	cluster: ecs.Cluster;
	sg: {
		dataStore: ec2.SecurityGroup;
	};
	namespace: servicediscovery.PrivateDnsNamespace;
	// NOTE: 必要に応じて依存するリソースの型を定義
}
export class DeployDataStoreService extends cdk.Stack {
	public readonly service: ecs.FargateService;
	constructor(scope: Construct, id: string, props: DeployDataStoreServiceProps) {
		super(scope, id, props);
		const env = props.env;
		const name = namespace({ stage: env.stage, service: env.service });

		props.env;

		/***************************************************************************
		 * task definition
		 **************************************************************************/

		const taskExecutionRole = new iam.Role(
			this,
			name.stack.deployDataStoreService.src.ecs.task.iam.role.resource.id,
			{
				roleName: name.stack.deployDataStoreService.src.ecs.task.iam.role.resource.name,
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
			name.stack.deployDataStoreService.src.ecs.task.define.app.resource.id,
			{
				compatibility: ecs.Compatibility.FARGATE,
				cpu: "1024", // Adjust based on your requirements
				memoryMiB: "2048", // Adjust based on your requirements
				executionRole: taskExecutionRole,
			},
		);

		const containerDb = task.addContainer(
			`${env.stage}-${env.service}-db-container`,
			{
				image: ecs.ContainerImage.fromEcrRepository(props.ecr.db),
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
					logGroup: props.logs.db,
					streamPrefix: `${env.stage}-${env.service}-db`,
				}),
				healthCheck: {
					// NOTE: environment.POSTGRES_USERのユーザーを使ってpg_isreadyを実行する
					command: ["CMD-SHELL", "pg_isready -U example || exit 1"],
					retries: 5,
					timeout: cdk.Duration.seconds(5),
					interval: cdk.Duration.seconds(10),
					startPeriod: cdk.Duration.seconds(30),
				},
			},
		);

		const service = new ecs.FargateService(
			this,
			`${env.stage}-${env.service}-data-store-service`,
			{
				cluster: props.cluster,
				taskDefinition: task,
				securityGroups: [props.sg.dataStore],
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
				cloudMapOptions: {
					name: 'data-store',
					dnsRecordType: servicediscovery.DnsRecordType.A,
					cloudMapNamespace: props.namespace,
				},
				enableExecuteCommand: true,
			},
		);

		/***************************************************************************
		 * output block
		 **************************************************************************/

		this.service = service;
	}
}
