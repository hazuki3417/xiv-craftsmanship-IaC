import * as cdk from "aws-cdk-lib";

interface XivCraftsmanshipEnv extends cdk.Environment {
	service: string;
	stage: string;
	host: string;
}

type XivCraftsmanshipTag = {
	Service: string;
	Stage: string;
};

export interface XivCraftsmanshipProps extends cdk.StackProps {
	tags: XivCraftsmanshipTag;
	env: XivCraftsmanshipEnv;
}
