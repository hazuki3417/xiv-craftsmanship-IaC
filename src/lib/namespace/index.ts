import { set } from "../../util/resource";
import { resource as ecr } from "./ecr";
import { resource as githubActions } from "./github-actions";
import { resource as infrastructure } from "./infrastructure";
import { resource as ecsTaskApp } from "./ecs-task-app";

export interface Namespace {
	env: string;
	service: string;
}

export const namespace = (args: Namespace) => {
	const { env, service } = args;

	const make = set({ env, service });

	/**
	 * stack.{stackName}.src.{resourceName}
	 * {stackName}   : stack name (e,g, app, infra)
	 * {resourceName}: resource name (e.g. vpc, sg, cluster)
	 * key casename: camel
	 */

	return {
		stack: {
			// stack name layer
			ecr: { src: ecr(make) },
			githubActions: { src: githubActions(make) },
			infrastructure: { src: infrastructure(make) },
			ecsTaskApp: { src: ecsTaskApp(make) },
		},
		ids: make.ids,
		names: make.names,
	};
};
