import * as lamdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as cdk from "aws-cdk-lib";

import { Construct } from "constructs";

export class ProducsAppStack extends cdk.Stack {
  readonly productsFetchHandler: lamdaNodeJs.NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.productsFetchHandler = new lamdaNodeJs.NodejsFunction(this, "ProductsFetchFunction", {
      runtime: lambda.Runtime.NODEJS_20_X, //especifica que a função Lambda será executada usando o Node.js 20.x
      memorySize: 512, //memoria que vai ser alocada para uso da função
      functionName: "ProductsFetchFunction", //identificador do serviço na aws
      entry: "lambda/products/productsFetchFunction.ts", //local da função a ser executada
      handler: "handler", //nome do metodo a ser executado
      timeout: cdk.Duration.seconds(5), //tempo maximo para execução da função
      bundling: { //define detalhes de empacotamento da função antes de ser enviada ao CloudFormation
        minify: true, // otimiza o código reduzindo seu tamanho
        sourceMap: false //evita a geração de mapas de debug
      },
    });
  }
}
