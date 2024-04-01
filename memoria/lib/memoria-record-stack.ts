import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IAMResources } from './memoria-record/iam';

export class MemoriaRecordStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const IamResource = new IAMResources(this, 'memoria-record');
  }
}
