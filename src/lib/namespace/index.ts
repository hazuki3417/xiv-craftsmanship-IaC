import { set } from "../../util/resource";
import { resource as ecr } from "./ecr";
import { resource as githubActions } from "./github-actions";
import { resource as infrastructure } from "./infrastructure";
import { resource as deployAppService } from "./deploy-app-service";
import { resource as deployDataStoreService } from "./deploy-data-store-service";

export interface Namespace {
	stage: string;
	service: string;
}

export const namespace = (args: Namespace) => {
	const { stage, service } = args;

	const make = set({ stage, service });

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
			deployAppService: { src: deployAppService(make) },
			deployDataStoreService: { src: deployDataStoreService(make) },
		},
		ids: make.ids,
		names: make.names,
		cfnExportNames: make.cfnExportNames,
	};
};
