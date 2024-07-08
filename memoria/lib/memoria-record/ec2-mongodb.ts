import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import env from '../environment';

export class EC2MongoDB extends Construct {
  constructor(scope: Construct, id: string) {
    /**
     * 環境ごとにec2インスタンスを作成する。
     */
    super(scope, id);

    if(env().allow(['production', 'staging'])){
          // 仮実装: ecsとの兼ね合いを考えて修正する
          const vpc = new ec2.Vpc(this, 'MongoDBVPC', {
            maxAzs: 2
          });
          const subnet = vpc.publicSubnets[0]; // Using the first public subnet

          const userData = ec2.UserData.forLinux();
          const instanceType = ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO);
          const ec2Instance = new ec2.Instance(this, 'MongoDBInstance', {
            vpc,
            instanceType,
            machineImage: new ec2.AmazonLinuxImage(),
            vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
            userData
          });

          ec2Instance.connections.allowFromAnyIpv4(ec2.Port.tcp(27017));

          new cdk.CfnOutput(this, 'MongoDBInstanceId', { value: ec2Instance.instanceId });
          new cdk.CfnOutput(this, 'MongoDBInstancePublicIP', { value: ec2Instance.instancePublicIp });
    }

    // NOTE: developmentのときはローカルで実行するためのインスタンスは不要
  }
}
