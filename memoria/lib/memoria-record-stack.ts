import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IAMResources, ECRResources, S3Resources } from './memoria-record';

export class MemoriaRecordStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // TODO: 第二引数の用途を調べる
    const IamResource = new IAMResources(this, 'memoria-record-iam');
    const EcrResource = new ECRResources(this, 'memoria-record-ecr');
    const S3Resource = new S3Resources(this, 'memoria-record-s3');
  }
}
