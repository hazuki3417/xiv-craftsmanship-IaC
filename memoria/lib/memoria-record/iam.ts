import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import envName, { getEnvName } from '../environment';

export class IAMResources extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    if (envName().deny(['development'])) {
      throw new Error(`Skip resource generation in ${getEnvName()} environment`);
    }

    new iam.Role(this, 'memoria-record', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      roleName: 'memoria-record-role',
    });
  }
}
