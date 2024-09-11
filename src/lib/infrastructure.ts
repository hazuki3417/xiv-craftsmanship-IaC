import { Construct } from "constructs";
import { namespace } from "./namespace";
import { XivCraftsmanshipProps } from "./type";
import * as cdk from "aws-cdk-lib";
import * as certificatemanager from "aws-cdk-lib/aws-certificatemanager";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elb from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as servicediscovery from "aws-cdk-lib/aws-servicediscovery";
import * as targets from "aws-cdk-lib/aws-route53-targets";

interface InfrastructureProps extends XivCraftsmanshipProps {
	// NOTE: 必要に応じて依存するリソースの型を定義
}
export class Infrastructure extends cdk.Stack {
	public readonly cluster: ecs.Cluster;
	public readonly alb: elb.ApplicationLoadBalancer;
	public readonly certificate: certificatemanager.ICertificate;
	public readonly namespace: servicediscovery.PrivateDnsNamespace;

	public readonly sg: {
		app: ec2.SecurityGroup;
		dataStore: ec2.SecurityGroup;
	};

	public readonly logs: {
		db: logs.ILogGroup;
		api: logs.ILogGroup;
		web: logs.ILogGroup;
	};

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
			name.stack.infrastructure.src.ec2.sg.app.resource.id,
			{
				securityGroupName:
					name.stack.infrastructure.src.ec2.sg.app.resource.name,
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

		const sgDataStore = new ec2.SecurityGroup(
			this,
			name.stack.infrastructure.src.ec2.sg.dataStore.resource.id,
			{
				securityGroupName:
					name.stack.infrastructure.src.ec2.sg.dataStore.resource.name,
				vpc: vpc,
				allowAllOutbound: true,
			},
		);

		sgApp.addIngressRule(
			ec2.Peer.anyIpv4(),
			ec2.Port.tcp(5432),
			"Allow PostgreSQL traffic from anywhere",
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

		const logsDb = new logs.LogGroup(
			this,
			name.stack.infrastructure.src.logs.logGroup.db.resource.id,
			{
				logGroupName:
					name.stack.infrastructure.src.logs.logGroup.db.resource.name,
				retention: logs.RetentionDays.ONE_WEEK,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
			},
		);

		const logsApi = new logs.LogGroup(
			this,
			name.stack.infrastructure.src.logs.logGroup.api.resource.id,
			{
				logGroupName:
					name.stack.infrastructure.src.logs.logGroup.api.resource.name,
				retention: logs.RetentionDays.ONE_WEEK,
				removalPolicy: cdk.RemovalPolicy.DESTROY,
			},
		);

		const logsWeb = new logs.LogGroup(
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
		 * service discovery
		 **************************************************************************/
		const dnsNamespace = new servicediscovery.PrivateDnsNamespace(
			this,
			name.stack.infrastructure.src.serviceDiscovery.namespace.resource.id,
			{
				name: `${env.stage}.${env.service}.local`,
				vpc: vpc,
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

		alb.addRedirect({
			sourcePort: 80,
			sourceProtocol: elb.ApplicationProtocol.HTTP,
			targetPort: 443,
			targetProtocol: elb.ApplicationProtocol.HTTPS,
		});

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

		/***************************************************************************
		 * output block
		 **************************************************************************/

		this.cluster = cluster;
		this.alb = alb;
		this.certificate = certificate;
		this.namespace = dnsNamespace;

		this.sg = {
			app: sgApp,
			dataStore: sgDataStore,
		};

		this.logs = {
			db: logsDb,
			api: logsApi,
			web: logsWeb,
		};

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
