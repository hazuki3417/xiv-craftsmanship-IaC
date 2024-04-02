import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { getEnvName } from '../environment';

export class S3Resources extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new cdk.aws_s3.Bucket(this, 'MemoriaRecordS3', {
      bucketName: `memoria-record-${getEnvName()}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}
