import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { namespace } from "./namespace";
import { XivCraftsmanshipTagType } from "./type";

export class ResourceGroup extends cdk.Stack {
  public readonly resourceGroup: cdk.aws_resourcegroups.CfnGroup;

  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);
		const tags = props.tags as XivCraftsmanshipTagType;
		const name = (namespace({ env: tags.environment, service: tags.service })).stack.resourceGroup.src;

    this.resourceGroup = new cdk.aws_resourcegroups.CfnGroup(this,name.resourceGroup.resource.id, {
      name: name.resourceGroup.resource.name,
    });
  }
}
