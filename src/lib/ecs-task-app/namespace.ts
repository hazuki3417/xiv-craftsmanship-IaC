import { create, NamespaceParams } from "../../util/resource";

export const namespace = (args: NamespaceParams) =>{
  const logDb = create({...args, id: 'LogsLogGroup', name: 'db'});
  const logApi = create({...args, id: 'LogsLogGroup', name: 'api'});
  const logWeb = create({...args, id: 'LogsLogGroup', name: 'web'});

  const role = create({...args, id: 'EcsTaskIamRole', name: 'app'});
  const task = create({...args, id: 'EcsTask', name: 'app'});

  return {
    logs : {
      logGroup: {
        db: {
          resource: {...logDb}
        },
        api: {
          resource: {...logApi}
        },
        web: {
          resource: {...logWeb}
        },
      }
    },
    ecs : {
      task: {
        iam : {
          role: {
            resource: {...role}
          },
        },
        define: {
          app: {
            resource: {...task},
            cfn: {
              arn: task.cfn('Arn'),
            }
          }
        },
      }
    }
  }
}
