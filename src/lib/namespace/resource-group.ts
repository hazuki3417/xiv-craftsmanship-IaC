import { Set } from "../../util/resource";

export const resource = (make: Set) => {
	return {
		resourceGroup: {
			resource: make.resource({ id: "ResourceGroup", name: "all" }),
		},
	};
};
