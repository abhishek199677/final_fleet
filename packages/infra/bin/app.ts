#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FleetOSDevStack } from '../lib/fleetos-dev-stack';

const app = new cdk.App();

new FleetOSDevStack(app, 'FleetOS-dev', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'ap-south-1',
  },
  description: 'Fleet OS development environment',
});

app.synth();
