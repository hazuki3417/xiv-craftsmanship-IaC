import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class ECRResources extends Construct {
  constructor(scope: Construct, id: string) {
    /**
     * すべての環境利用可能なレジストリとして作成する。
     * コンテナイメージのタグに環境名を含めて識別する。
     * TODO: 第二引数の用途を調べる
     */
    super(scope, id);

    new cdk.aws_ecr.Repository(this, 'MemoriaRecordECR', {
      repositoryName: 'memoria-record',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      imageScanOnPush: false,
      imageTagMutability: cdk.aws_ecr.TagMutability.IMMUTABLE,
    });

    // TODO: ライフサイクルポリシーを設定する
  }
}
