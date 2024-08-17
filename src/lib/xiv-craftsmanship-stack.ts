import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { XivCraftsmanshipTagType } from './type';

export class XivCraftsmanshipStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const tags = props.tags as XivCraftsmanshipTagType;

    const ecrWeb = new ecr.Repository(this, `${tags.environment}-EcrRepositoryWeb`, {
      repositoryName: `${tags.environment}-${tags.service}-web`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ecrApi = new ecr.Repository(this, `${tags.environment}-EcrRepositoryApi`, {
      repositoryName: `${tags.environment}-${tags.service}-api`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const ecrDb = new ecr.Repository(this, `${tags.environment}-EcrRepositoryDb`, {
      repositoryName: `${tags.environment}-${tags.service}-db`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    ecrWeb.addLifecycleRule({ maxImageCount: 5 });
    ecrApi.addLifecycleRule({ maxImageCount: 5 });
    ecrDb.addLifecycleRule({ maxImageCount: 5 });
  }
}
