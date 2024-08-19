#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { XivCraftsmanshipStack } from '../lib/xiv-craftsmanship-stack';
import { verifyEnvName, getEnvName } from '../lib/environment';
import { XivCraftsmanshipTagType } from '../lib/type';
import { XivCraftsmanshipCiCdStack } from '../lib/xiv-craftsmanship-cicd-stack';

verifyEnvName();

const tags = {
    service: 'xiv-craftsmanship',
    environment: getEnvName(),
} as XivCraftsmanshipTagType

const app = new cdk.App();

new XivCraftsmanshipCiCdStack(app, 'XivCraftsmanshipCiCdStack', {
  tags
})

new XivCraftsmanshipStack(app, 'XivCraftsmanshipStack', {
  tags
});

