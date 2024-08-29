import { Construct } from "constructs";
import { namespace } from "./namespace";
import { XivCraftsmanshipProps } from "./type";
import * as cdk from "aws-cdk-lib";
import * as ecr from "aws-cdk-lib/aws-ecr";

interface EcrProps extends XivCraftsmanshipProps {
	// NOTE: 必要に応じて依存するリソースの型を定義
}
export class Ecr extends cdk.Stack {
	public readonly db: ecr.Repository;
	public readonly api: ecr.Repository;
	public readonly web: ecr.Repository;

	constructor(scope: Construct, id: string, props: EcrProps) {
		super(scope, id, props);
		const env = props.env;
		const name = namespace({ stage: env.stage, service: env.service }).stack.ecr
			.src;

		this.db = new ecr.Repository(this, name.ecr.db.resource.id, {
			repositoryName: name.ecr.db.resource.name,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		this.api = new ecr.Repository(this, name.ecr.api.resource.id, {
			repositoryName: name.ecr.api.resource.name,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		this.web = new ecr.Repository(this, name.ecr.web.resource.id, {
			repositoryName: name.ecr.web.resource.name,
			removalPolicy: cdk.RemovalPolicy.RETAIN,
		});

		this.db.addLifecycleRule({ maxImageCount: 5 });
		this.api.addLifecycleRule({ maxImageCount: 5 });
		this.web.addLifecycleRule({ maxImageCount: 5 });

		/**
		 * export
		 */

		new cdk.CfnOutput(this, name.ecr.db.cfn.arn.exportId, {
			value: this.db.repositoryArn,
			exportName: name.ecr.db.cfn.arn.exportName,
		});

		new cdk.CfnOutput(this, name.ecr.api.cfn.arn.exportId, {
			value: this.api.repositoryArn,
			exportName: name.ecr.api.cfn.arn.exportName,
		});

		new cdk.CfnOutput(this, name.ecr.web.cfn.arn.exportId, {
			value: this.web.repositoryArn,
			exportName: name.ecr.web.cfn.arn.exportName,
		});
	}
}
