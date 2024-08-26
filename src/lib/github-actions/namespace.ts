import { create, NamespaceParams } from "../../util/resource";

export const namespace = (args: NamespaceParams) =>{
  const oidc = create({...args, id: 'OpenIdConnectProvider', name: 'GitHubActionsProvider'});
  const role = create({...args, id: 'Role', name: 'GitHubActionsEcrDeployRole'});
  return {
    iam: {
      oidc: {
        resource: {...oidc}
      },
      role: {
        resource: {...role},
        cfn: {
          name: role.cfn('Name'),
        }
      },
    },
  }
}
