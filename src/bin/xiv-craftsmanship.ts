#!/usr/bin/env node
import "source-map-support/register";
import { Ecr } from "../lib/ecr";
import { GitHubActions } from "../lib/github-actions";
import { Infrastructure } from "../lib/infrastructure";
import { stage } from "../util/stage";
import { XivCraftsmanshipProps } from "../lib/type";
import * as cdk from "aws-cdk-lib";

stage.env.verify();

const props: XivCraftsmanshipProps = {
	env: {
		service: "xiv-craftsmanship",
		stage: stage.env.get(),
	},
	tags: {
		Service: "xiv-craftsmanship",
		Stage: stage.env.get(),
	},
};

const app = new cdk.App();

new GitHubActions(app, "XivCraftsmanship-GitHubActions", props);
new Ecr(app, "XivCraftsmanship-Ecr", props);
new Infrastructure(app, "XivCraftsmanship-Infrastructure", props);
