#!/usr/bin/env node
import "source-map-support/register";
import { Ecr } from "../lib/ecr";
import { GitHubActions } from "../lib/github-actions";
import { Infrastructure } from "../lib/infrastructure";
import { DeployDataStoreService } from "../lib/deploy-data-store-service";
import { stage } from "../util/stage";
import { XivCraftsmanshipProps } from "../lib/type";
import * as cdk from "aws-cdk-lib";
import { DeployAppService } from "../lib/deploy-app-service";

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

const deployDataStoreService = new DeployDataStoreService(
	app,
	"XivCraftsmanship-DeployDataStoreService",
	{
		ecr: {
			db: ecr.db,
		},
		logs: {
			db: infrastructure.logs.db,
		},
		cluster: infrastructure.cluster,
		namespace: infrastructure.namespace,
		sg: {
			dataStore: infrastructure.sg.dataStore,
		},
		...props,
	},
);

const deployAppService = new DeployAppService(
	app,
	"XivCraftsmanship-DeployAppService",
	{
		ecs: {
			service: {
				dataStore: deployDataStoreService.service,
			},
		},
		ecr: {
			web: ecr.web,
			api: ecr.api,
		},
		logs: {
			web: infrastructure.logs.web,
			api: infrastructure.logs.api,
		},
		cluster: infrastructure.cluster,
		alb: infrastructure.alb,
		certificate: infrastructure.certificate,
		namespace: infrastructure.namespace,
		sg: {
			app: infrastructure.sg.app,
		},
		...props,
	},
);

/*******************************************************************************
 * dependencies
 ******************************************************************************/
deployDataStoreService.addDependency(ecr);
deployDataStoreService.addDependency(infrastructure);

/*******************************************************************************
 * Synth
 ******************************************************************************/
app.synth();
