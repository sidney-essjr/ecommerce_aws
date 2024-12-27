#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import "source-map-support/register";
import { ProductsAppStack } from "../lib/productsApp-stack";
import { EcommerceApiStack } from "../lib/ecommerceApi-stack";
import { ProductsAppLayersStack } from "../lib/productsAppLayers-stack";
import { EventsDdbStack } from "../lib/eventsDdb-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: "061039771534",
  region: "sa-east-1",
};

const tags = {
  cost: "Ecommerce",
  team: "Sessjr",
};

const productsAppLayerStack = new ProductsAppLayersStack(app, "ProductsAppLayers", {
  tags: tags,
  env: env,
});

const eventsDdbStack = new EventsDdbStack(app, "EventsDdb", {
  tags: tags,
  env: env,
});

const productsAppStack = new ProductsAppStack(app, "ProductsApp", {
  eventsDdb: eventsDdbStack.table,
  tags: tags,
  env: env,
});
productsAppStack.addDependency(productsAppLayerStack);
productsAppStack.addDependency(eventsDdbStack);

const eCommerceApiStack = new EcommerceApiStack(app, "EcommerceApi", {
  productsFetchHandler: productsAppStack.productsFetchHandler,
  productsAdminHandler: productsAppStack.productsAdminHandler,
  tags: tags,
  env: env,
});
eCommerceApiStack.addDependency(productsAppStack);
