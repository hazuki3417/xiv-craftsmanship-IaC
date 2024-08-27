import { Set } from "../../util/resource";

export const resource = (make: Set) => {
	return {
		ecr: {
			db: {
				resource: make.resource({ id: "EcrRepositoryDb", name: "db" }),
				cfn: {
					arn: make.cfn({ id: "EcrRepositoryDbArn" }),
				},
			},
			api: {
				resource: make.resource({ id: "EcrRepositoryApi", name: "api" }),
				cfn: {
					arn: make.cfn({ id: "EcrRepositoryApiArn" }),
				},
			},
			web: {
				resource: make.resource({ id: "EcrRepositoryWeb", name: "web" }),
				cfn: {
					arn: make.cfn({ id: "EcrRepositoryWebArn" }),
				},
			},
		},
	};
};
