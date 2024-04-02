#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MemoriaStack } from '../lib/memoria-stack';
import { MemoriaRecordStack } from '../lib/memoria-record-stack';
import { verifyEnvName, getEnvName } from '../lib/environment';

verifyEnvName();

const app = new cdk.App();

// new MemoriaStack(app, 'MemoriaStack');
new MemoriaRecordStack(app, 'MemoriaRecordStack', {
  tags: {
    Environment: getEnvName(),
    ServiceName: 'memoria',
    MicroServiceName: 'memoria-record'
  }
});
