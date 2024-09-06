import { Set } from "../../util/resource";

export const resource = (make: Set) => {
	return {
		ecs: {
			task: {
				iam: {
					role: {
						resource: make.resource({
							id: "EcsTaskRoleDataStore",
							name: "ecs-task-role-data-store",
						}),
					},
				},
				define: {
					app: {
						resource: make.resource({
							id: "EcsTaskDefinitionDataStore",
							name: "data-store",
						}),
					},
				},
			},
		},
	};
};
