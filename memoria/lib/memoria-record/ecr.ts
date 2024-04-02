import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ECRResources extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    /**
     * すべての環境で共通のレジストリを使用する。
     * コンテナイメージのタグに環境名を含めて管理する。
     * TODO: 第二引数の用途を調べる
     */
    new cdk.aws_ecr.Repository(this, 'MemoriaRecordECR', {
      repositoryName: 'memoria-record',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: true,
      imageTagMutability: cdk.aws_ecr.TagMutability.MUTABLE,
    });

    // TODO: ライフサイクルポリシーを設定する
  }
}
