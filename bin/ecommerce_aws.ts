#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { EcommerceAwsStack } from "../lib/ecommerce_aws-stack";

const app = new cdk.App();
new EcommerceAwsStack(app, "EcommerceAwsStack", {});
