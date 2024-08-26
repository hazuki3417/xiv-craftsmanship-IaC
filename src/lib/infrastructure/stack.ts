import { Construct } from 'constructs';
import { XivCraftsmanshipTagType } from '../type';
import * as cdk from 'aws-cdk-lib';
import * as ec2  from 'aws-cdk-lib/aws-ec2';
import * as ecs  from 'aws-cdk-lib/aws-ecs';
import { namespace } from './namespace'

export class Infrastructure extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const tags = props.tags as XivCraftsmanshipTagType;

    const name = namespace({env: tags.environment, service: tags.service});

    /***************************************************************************
     * network
     **************************************************************************/

    const vpc = new ec2.Vpc(this, name.ec2.vpc.resource.id, {
      vpcName: name.ec2.vpc.resource.name,
      maxAzs: 2,
    });

    const sgApp = new ec2.SecurityGroup(this, name.ec2.sg.resource.id, {
      securityGroupName: name.ec2.sg.resource.name,
      vpc:vpc,
      allowAllOutbound: true,
    });

    sgApp.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic from anywhere');
    sgApp.addIngressRule(ec2.Peer.ipv4('0.0.0.0/0'), ec2.Port.tcp(443), 'Allow HTTPS traffic from anywhere');

    vpc.addGatewayEndpoint(name.ec2.vpc.gateway.ecr.resource.id, {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
    })

    vpc.addInterfaceEndpoint(name.ec2.vpc.interface.ecr.resource.id, {
      service: ec2.InterfaceVpcEndpointAwsService.ECR,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
    })

    vpc.addInterfaceEndpoint(name.ec2.vpc.interface.ecrDocker.resource.id, {
      service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }
    })

    vpc.addInterfaceEndpoint(name.ec2.vpc.interface.cloudwatchLogs.resource.id, {
      service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    })

    /***************************************************************************
     * ecs cluster
     **************************************************************************/

    const cluster = new ecs.Cluster(this,name.ecs.cluster.resource.id, {
      clusterName: name.ecs.cluster.resource.name,
      vpc: vpc,
    })
  }
}
