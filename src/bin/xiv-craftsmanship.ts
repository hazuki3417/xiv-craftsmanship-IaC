#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { stage } from "../util/stage";
import { XivCraftsmanshipTagType } from "../lib/type";
import { Ecr } from "../lib/ecr";
import { GitHubActions } from "../lib/github-actions";
import { Infrastructure } from "../lib/infrastructure";

stage.env.verify();

const tags = {
	service: "xiv-craftsmanship",
	environment: stage.env.get(),
} as XivCraftsmanshipTagType;

const app = new cdk.App();

new GitHubActions(app, "XivCraftsmanship-GitHubActions", {
	tags,
});

new Ecr(app, "XivCraftsmanship-Ecr", {
	tags,
});

new Infrastructure(app, "XivCraftsmanship-Infrastructure", {
	tags,
});
