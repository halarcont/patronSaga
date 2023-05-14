#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkServerlessSagaStack } from '../lib/cdk-serverless-saga-stack';

const app = new cdk.App();
new CdkServerlessSagaStack(app, 'CdkServerlessSagaStack', {
});