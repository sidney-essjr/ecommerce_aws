import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as ssm from "aws-cdk-lib/aws-ssm";

import { Construct } from "constructs";
import path = require("path");

interface ProductsAppStackProps extends cdk.StackProps {
  eventsDdb: dynamodb.Table;
}

export class ProductsAppStack extends cdk.Stack {
  readonly productsFetchHandler: lambdaNodeJs.NodejsFunction;
  readonly productsAdminHandler: lambdaNodeJs.NodejsFunction;
  readonly productsDdb: dynamodb.Table;

  constructor(scope: Construct, id: string, props: ProductsAppStackProps) {
    super(scope, id, props);

    //código para criação da tabela products no DynamoDB
    this.productsDdb = new dynamodb.Table(this, "ProductsDdb", {
      tableName: "products",
      removalPolicy: cdk.RemovalPolicy.DESTROY, //ao remover a stack a tabela também é removida
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PROVISIONED, //define o modo de capacidade para provisionado
      readCapacity: 1,
      writeCapacity: 1,
    });

    //Products Layer - resgata o Arn da função lambda layer no SSM (Systems Manager) e gera a referencia para esse layer
    const productsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      "ProductsLayerVersionArn"
    );
    const productLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "ProductsLayerVersionArn",
      productsLayerArn
    );

    //Product Events Layer - resgata o Arn da função lambda layer no SSM (Systems Manager) e gera a referencia para esse layer
    const productEventsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      "ProductEventsLayerVersionArn"
    );
    const productEventsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "ProductEventsLayerVersionArn",
      productEventsLayerArn
    );

    //função responsavel pela criação de eventos na tabela events
    const productEventsHandler = new lambdaNodeJs.NodejsFunction(this, "ProductEventsFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      functionName: "ProductEventsFunction",
      entry: path.join(__dirname, "lambda/products/productEventsFunction.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(5),
      bundling: {
        minify: true,
        sourceMap: false,
      },
      environment: {
        EVENTS_DDB: props.eventsDdb.tableName,
      },
      layers: [productEventsLayer],
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
    });

    //concede permissão de escrita na tabela events para a função productEventsHandler
    props.eventsDdb.grantWriteData(productEventsHandler);

    //função responsável pela leitura na tabela "products"
    this.productsFetchHandler = new lambdaNodeJs.NodejsFunction(this, "ProductsFetchFunction", {
      runtime: lambda.Runtime.NODEJS_20_X, //especifica que a função Lambda será executada usando o Node.js 20.x
      memorySize: 512, //memoria que vai ser alocada para uso da função
      functionName: "ProductsFetchFunction", //identificador do serviço na aws
      entry: path.join(__dirname, "lambda/products/productsFetchFunction.ts"), //local da função a ser executada
      handler: "handler", //nome do metodo a ser executado
      timeout: cdk.Duration.seconds(5), //tempo maximo para execução da função
      tracing: lambda.Tracing.ACTIVE, //habilita o rastreamento no x-ray
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0, //habilita o cloudWatch lambda insight
      bundling: {
        //define detalhes de empacotamento da função antes de ser enviada ao CloudFormation
        minify: true, // otimiza o código reduzindo seu tamanho
        sourceMap: false, //evita a geração de mapas de debug
      },
      environment: {
        PRODUCTS_DDB: this.productsDdb.tableName, //informa o nome da tabela do DDB a função lambda
      },
      layers: [productLayer], //busca parte de códigos nessa função
    });

    //concede permissão de leitura na tabela products para a função productsFetchHandler
    this.productsDdb.grantReadData(this.productsFetchHandler);

    //função responsável pela escrita na tabela "products"
    this.productsAdminHandler = new lambdaNodeJs.NodejsFunction(this, "ProductsAdminFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 512,
      functionName: "ProductsAdminFunction",
      entry: path.join(__dirname, "lambda/products/productsAdminFunction.ts"),
      handler: "handler",
      timeout: cdk.Duration.seconds(5),
      tracing: lambda.Tracing.ACTIVE,
      insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_119_0,
      bundling: {
        minify: true,
        sourceMap: false,
      },
      environment: {
        PRODUCTS_DDB: this.productsDdb.tableName,
        PRODUCT_EVENTS_FUNCTION_ARN: productEventsHandler.functionArn,
      },
      layers: [productLayer, productEventsLayer],
    });

    //concede permissão de escrita na tabela products para a função productAdminHandler
    this.productsDdb.grantWriteData(this.productsAdminHandler);
    //concede permissão para invocação da função productEventsHandler dentro da função productsAdminHandler
    productEventsHandler.grantInvoke(this.productsAdminHandler);
  }
}
