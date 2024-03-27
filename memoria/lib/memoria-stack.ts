import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class MemoriaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 仮実装
    const role = new iam.Role(this, 'memoria', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'memoria-role',
    });
  }
}
