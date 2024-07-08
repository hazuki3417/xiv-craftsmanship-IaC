import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import env, { getEnvName } from '../environment';

export class IAMCiCd extends Construct {
  constructor(scope: Construct, id: string) {
    /**
     * 環境ごとにIAMリソースを作成する。（CICD用）
     * 必要なリソース、アクセス制御は環境ごとに異なる可能性があるため、
     * 環境ごとに異なるIAMリソースを利用するように運用する。
     */
    super(scope, id);

    if(env().allow(['production'])){
      // TODO: 後で用意する
    }

    if(env().allow(['staging'])){
      // TODO: 後で用意する
    }

    if(env().allow(['development'])){
      // TODO: 後で用意する
    }
  }
}
