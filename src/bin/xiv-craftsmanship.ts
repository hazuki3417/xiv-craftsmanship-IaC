#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { XivCraftsmanshipStack } from '../lib/xiv-craftsmanship-stack';
import { verifyEnvName, getEnvName } from '../lib/environment';
import { XivCraftsmanshipTagType } from '../lib/type';

verifyEnvName();

const app = new cdk.App();
new XivCraftsmanshipStack(app, 'XivCraftsmanshipStack', {
  tags: {
    service: 'xiv-craftsmanship',
    environment: getEnvName(),
  } as XivCraftsmanshipTagType
});
