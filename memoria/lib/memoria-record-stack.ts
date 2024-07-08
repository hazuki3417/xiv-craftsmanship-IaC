import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IAMApp, ECR, S3, EC2MongoDB, IAMCiCd } from './memoria-record';
import { getEnvName } from './environment';

export class MemoriaRecordStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const resourceGroup = new cdk.aws_resourcegroups.CfnGroup(this, 'MemoriaRecordResourceGroup', {
      name: `memoria-record-${getEnvName()}`,
    });

    // TODO: 接頭辞にstackのidが付与されるので、名前を短くしてもよいかもしれない
    // TODO: 第二引数の用途を調べる
    // new EC2MongoDB(this, 'memoria-record-mongodb');
    new IAMApp(this, 'memoria-record-iam-app');
    new IAMCiCd(this, 'memoria-record-iam-cicd');
    new ECR(this, 'memoria-record-ecr');
    new S3(this, 'memoria-record-s3');
  }
}
