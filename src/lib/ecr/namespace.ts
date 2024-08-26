import { create, NamespaceParams } from "../../util/resource";

export const namespace = (args: NamespaceParams) =>{
  const ecrDb = create({...args, id: 'EcrRepository', name: 'db'});
  const ecrApi = create({...args, id: 'EcrRepository', name: 'api'});
  const ecrWeb = create({...args, id: 'EcrRepository', name: 'web'});
  return {
    ecr: {
      db: {
        resource: {...ecrDb},
        cfn: {
          arn: ecrDb.cfn('Arn'),
        },
      },
      api: {
        resource: {...ecrApi},
        cfn: {
          arn: ecrApi.cfn('Arn'),
        },
      },
      web: {
        resource: {...ecrWeb},
        cfn: {
          arn: ecrWeb.cfn('Arn'),
        },
      },
    },
  }
}
