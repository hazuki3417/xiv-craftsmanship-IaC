import { Set } from "../../util/resource";

export const resource = (make: Set) => {
	return {
		logs: {
			logGroup: {
				db: {
					resource: make.resource({ id: "CloudWatchLogGroupDb", name: "db" }),
				},
				api: {
					resource: make.resource({ id: "CloudWatchLogGroupApi", name: "api" }),
				},
				web: {
					resource: make.resource({ id: "CloudWatchLogGroupWeb", name: "web" }),
				},
			},
		},
		ecs: {
			task: {
				iam: {
					role: {
						resource: make.resource({
							id: "EcsTaskRoleApp",
							name: "ecs-task-role-app",
						}),
						cfn : {
							arn: make.cfn({ id: "EcsTaskRoleAppArn" }),
						}
					},
				},
				define: {
					app: {
						resource: make.resource({
							id: "EcsTaskDefinitionApp",
							name: "app",
						}),
						cfn: {
							arn: make.cfn({ id: "EcsTaskDefinitionAppArn" }),
						},
					},
				},
			},
		},
	};
};
