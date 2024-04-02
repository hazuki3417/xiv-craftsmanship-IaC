import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import env, { getEnvName } from '../environment';

export class IAMResources extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    if(env().allow(['production', 'staging'])){
      // production,stagingのときはコンテナにアタッチするためのIAMロールを作成する
      // TODO: 第二引数の用途を調べる
      const role = new cdk.aws_iam.Role(this, 'MemoriaRecordIAM', {
        assumedBy: new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
        roleName: `memoria-record-app-${getEnvName()}`,
      });
      // TODO: アクセス範囲を制限する
      role.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
    }

    if (env().allow(['development'])) {
      // developmentのときはローカルで実行するためのIAMクレデンシャルを作成する
      // TODO: 第二引数の用途を調べる
      const user = new cdk.aws_iam.User(this, 'MemoriaRecordIAM', {
        userName: `memoria-record-app-${getEnvName()}`,
      });
      // TODO: アクセス範囲を制限する
      user.addManagedPolicy(cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));


      // IAMユーザーのアクセスキーを作成
      const accessKey = new cdk.aws_iam.CfnAccessKey(this, 'MemoriaRecordIAMUserAccessKey', {
        userName: user.userName
      });

      // 出力にアクセスキーとシークレットアクセスキーを表示
      new cdk.CfnOutput(this, 'AccessKeyId', {
        value: accessKey.ref
      });
      new cdk.CfnOutput(this, 'SecretAccessKey', {
        value: accessKey.attrSecretAccessKey
      });
    }

  }
}
