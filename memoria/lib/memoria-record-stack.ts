import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IAMResources, ECRResources, S3Resources } from './memoria-record';
import { getEnvName } from './environment';
import { EC2MongoDBResources } from './memoria-record/ec2-mongodb';

export class MemoriaRecordStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const resourceGroup = new cdk.aws_resourcegroups.CfnGroup(this, 'MemoriaRecordResourceGroup', {
      name: `memoria-record-${getEnvName()}`,
    });

    // TODO: 第二引数の用途を調べる
    // new EC2MongoDBResources(this, 'memoria-record-mongodb');
    new IAMResources(this, 'memoria-record-iam');
    new ECRResources(this, 'memoria-record-ecr');
    new S3Resources(this, 'memoria-record-s3');
  }
}
