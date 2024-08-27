import { Set } from "../../util/resource";

export const resource = (make: Set) => {
	return {
		ec2: {
			vpc: {
				resource: make.resource({ id: "Ec2VpcApp", name: "app" }),
				cfn: {
					vpcId: make.cfn({ id: "Ec2VpcAppId" }),
				},
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
				cfn: {
					securityGroupId: make.cfn({ id: "Ec2SecurityGroupId" }),
				},
			},
		},
		ecs: {
			cluster: {
				resource: make.resource({ id: "EcsClusterApp", name: "app" }),
				cfn: {
					arn: make.cfn({ id: "EcsClusterAppArn" }),
					name: make.cfn({ id: "EcsClusterAppName" }),
				},
			},
		},
	};
};
