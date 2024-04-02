import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import env, { getEnvName } from '../environment';

export class IAMResources extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    if (env().deny(['development'])) {
      throw new Error(`Skip resource generation in ${getEnvName()} environment`);
    }

    // TODO: 第二引数の用途を調べる
    new iam.Role(this, 'MemoriaRecordIAM', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'memoria-record-role',
    });
  }
}
