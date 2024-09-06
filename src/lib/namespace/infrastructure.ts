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
				app: {
					resource: make.resource({ id: "Ec2SecurityGroupApp", name: "app" }),
				},
				dataStore: {
					resource: make.resource({ id: "Ec2SecurityGroupDataStore", name: "data-store" }),
				}
			},
		},
		ecs: {
			cluster: {
				resource: make.resource({ id: "EcsClusterApp", name: "app" }),
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
			},
		},
		route53: {
			zone: {
				resource: make.resource({ id: "Route53ZoneApp" }),
			},
			record: {
				web: {
					resource: make.resource({ id: "Route53RecordWeb" }),
					cfn: {
						dns: make.cfn({ id: "Route53RecordWebDns" }),
					},
				},
			},
		},
		certificatemanager: {
			certificate: {
				resource: make.resource({ id: "CertificateManagerCertificateApp" }),
			},
		},
	};
};
