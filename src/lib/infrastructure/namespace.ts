import { create, NamespaceParams } from "../../util/resource";

export const namespace = (args: NamespaceParams) =>{
  const vpc = create({...args, id: 'Ec2Vpc', name: 'app'});
  const sg = create({...args, id: 'Ec2SecurityGroup', name: 'app'});
  const cluster = create({...args, id: 'EcsCluster', name: 'app'});

  return {
    ec2: {
      vpc: {
        resource: {...vpc},
        // cfn: {
        //   name: vpc.cfn('Name'),
        // }
        gateway : {
          ecr: {
            resource: create({...args, id: 'VpcGateway', name: 'Ecr'})
          }
        },
        interface: {
          ecr: {
            resource: create({...args, id: 'VpcInterface', name: 'Ecr'})
          },
          ecrDocker: {
            resource: create({...args, id: 'VpcInterface', name: 'EcrDocker'})
          },
          cloudwatchLogs: {
            resource: create({...args, id: 'VpcInterface', name: 'CloudWatchLogs'})
          },
        }
      },
      sg: {
        resource: {...sg}
      },
    },
    ecs : {
      cluster: {
        resource: {...cluster}
      },
    }
  }
}
