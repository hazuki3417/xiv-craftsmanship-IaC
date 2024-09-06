#!/usr/bin/env node
import "source-map-support/register";
import { Ecr } from "../lib/ecr";
import { GitHubActions } from "../lib/github-actions";
import { Infrastructure } from "../lib/infrastructure";
import { Deploy } from "../lib/deploy";
import { stage } from "../util/stage";
import { XivCraftsmanshipProps } from "../lib/type";
import * as cdk from "aws-cdk-lib";

stage.env.verify();

const props: XivCraftsmanshipProps = {
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
		service: "xiv-craftsmanship",
		stage: stage.env.get(),
		host: "xiv-craftsmanship.com",
	},
	tags: {
		Service: "xiv-craftsmanship",
		Stage: stage.env.get(),
	},
};

const app = new cdk.App();

/*******************************************************************************
 * stacks
 ******************************************************************************/
new GitHubActions(app, "XivCraftsmanship-GitHubActions", {
	...props,
});

const ecr = new Ecr(app, "XivCraftsmanship-Ecr", {
	...props,
});

const infrastructure = new Infrastructure(
	app,
	"XivCraftsmanship-Infrastructure",
	{
		...props,
	},
);

const deploy = new Deploy(app, "XivCraftsmanship-Deploy", {
	ecr: {
		db: ecr.db,
		api: ecr.api,
		web: ecr.web,
	},
	logs: {
		db: infrastructure.logs.db,
		api: infrastructure.logs.api,
		web: infrastructure.logs.web,
	},
	alb: infrastructure.alb,
	cluster: infrastructure.cluster,
	certificate: infrastructure.certificate,
	sg: {
		app: infrastructure.sg.app,
	},
	...props,
});

/*******************************************************************************
 * dependencies
 ******************************************************************************/
deploy.addDependency(ecr);
deploy.addDependency(infrastructure);

/*******************************************************************************
 * Synth
 ******************************************************************************/
app.synth();
