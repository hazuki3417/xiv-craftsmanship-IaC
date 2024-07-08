#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MemoriaStack } from '../lib/memoria-stack';
import { MemoriaRecordStack } from '../lib/memoria-record-stack';
import { verifyEnvName, getEnvName } from '../lib/environment';

verifyEnvName();

type RootTagType = {
  Environment: string;
  ServiceName: string;
};

type MicroServiceTagType = RootTagType & {
  MicroServiceName: string;
};

const app = new cdk.App();

const rootTag: RootTagType = {
  Environment: getEnvName(),
  ServiceName: 'memoria'
};

// new MemoriaStack(app, 'MemoriaStack');
new MemoriaRecordStack(app, 'MemoriaRecordStack', {
  tags: { ...rootTag,
    MicroServiceName: 'memoria-record'
  } as MicroServiceTagType
});
