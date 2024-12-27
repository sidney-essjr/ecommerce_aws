import * as lamdaNodeJs from "aws-cdk-lib/aws-lambda-nodejs";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cwlogs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

interface EcommerceApiStackProps extends cdk.StackProps {
  productsFetchHandler: lamdaNodeJs.NodejsFunction;
  productsAdminHandler: lamdaNodeJs.NodejsFunction;
}

export class EcommerceApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcommerceApiStackProps) {
    super(scope, id, props);

    const logGroup = new cwlogs.LogGroup(this, "EcommerceApiLogs", {
      retention: cwlogs.RetentionDays.ONE_WEEK, // retém logs por apenas 7 dias
    });
    const api = new apigateway.RestApi(this, "EcommerceApi", {
      restApiName: "EcommerceApi",
      cloudWatchRole: true,
      deployOptions: {
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup), //indica ao apiGateway onde os logs devem ser gerados
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          httpMethod: true,
          ip: true, //informação sensivel
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          caller: true,
          user: true, //informação sensivel PII
        }),
      },
    });

    //faz a integração da função lambda productsFetchHandler com o apigateway
    const productsFetchIntegration = new apigateway.LambdaIntegration(props.productsFetchHandler);

    // GET "/products"
    const productsResource = api.root.addResource("products");
    productsResource.addMethod("GET", productsFetchIntegration);

    // GET "/products/{id}"
    const productIdResource = productsResource.addResource("{id}");
    productIdResource.addMethod("GET", productsFetchIntegration);

    //faz a integração da função lambda productsAdminHandler com o apigateway
    const productsAdminIntegration = new apigateway.LambdaIntegration(props.productsAdminHandler);

    // POST /products
    productsResource.addMethod("POST", productsAdminIntegration);

    // PUT /products/{id}
    productIdResource.addMethod("PUT", productsAdminIntegration);
    
    // DELETE /products/{id}
    productIdResource.addMethod("DELETE", productsAdminIntegration);
  }
}
