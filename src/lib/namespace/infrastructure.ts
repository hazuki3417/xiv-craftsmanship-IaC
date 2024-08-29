import { Set } from "../../util/resource";

export const resource = (make: Set) => {
	return {
		ec2: {
			vpc: {
				resource: make.resource({ id: "Ec2VpcApp", name: "app" }),
				gateway: {
					ecr: {
						resource: make.resource({ id: "VpcGatewayS3", name: "S3" }),
					},
				},
				interface: {
					ecr: {
						resource: make.resource({ id: "VpcInterfaceEcr", name: "Ecr" }),
					},
					ecrDocker: {
						resource: make.resource({
							id: "VpcInterfaceEcrDocker",
							name: "EcrDocker",
						}),
					},
					cloudwatchLogs: {
						resource: make.resource({
							id: "VpcInterfaceCloudWatchLogs",
							name: "CloudWatchLogs",
						}),
					},
				},
			},
			sg: {
				resource: make.resource({ id: "Ec2SecurityGroupApp", name: "app" }),
			},
		},
		ecs: {
			cluster: {
				resource: make.resource({ id: "EcsClusterApp", name: "app" }),
			},
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
		elb: {
			loadBalancer: {
				resource: make.resource({ id: "ElbLoadBalancerApp", name: "app" }),
				cfn: {
					dns: make.cfn({ id: "ElbLoadBalancerAppDns" }),
				},
			},
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
