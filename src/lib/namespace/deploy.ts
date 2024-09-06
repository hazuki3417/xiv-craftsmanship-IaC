import { Set } from "../../util/resource";

export const resource = (make: Set) => {
	return {
		ecs: {
			task: {
				iam: {
					role: {
						resource: make.resource({
							id: "EcsTaskRoleApp",
							name: "ecs-task-role-app",
						}),
					},
				},
				define: {
					app: {
						resource: make.resource({
							id: "EcsTaskDefinitionApp",
							name: "app",
						}),
					},
				},
			},
		},
		elb: {
			listener: {
				web: {
					resource: make.resource({ id: "ElbListenerWeb", name: "web" }),
				},
			},
			targetGroup: {
				web: {
					resource: make.resource({ id: "ElbTargetGroupWeb", name: "web" }),
				},
			},
			listenerTargetGroup: {
				web: {
					resource: make.resource({
						id: "ElbListenerTargetGroupWeb",
						name: "web",
					}),
				},
			},
		},
	};
};
