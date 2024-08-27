import { Set } from "../../util/resource";

export const resource = (make: Set) => {
	return {
		iam: {
			oidc: {
				resource: make.resource({
					id: "GitHubActionsOpenIdConnectProvider",
					name: "GitHubActionsProvider",
				}),
			},
			role: {
				resource: make.resource({
					id: "GitHubActionsRole",
					name: "GitHubActionsEcrDeployRole",
				}),
				cfn: {
					name: make.cfn({ id: "GitHubActionsRoleName" }),
				},
			},
		},
	};
};
