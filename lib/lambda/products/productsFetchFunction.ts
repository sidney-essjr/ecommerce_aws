import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { ProductRepository } from "/opt/nodejs/productsLayer";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";

const productsDdb = process.env.PRODUCTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();
const productRepository = new ProductRepository(ddbClient, productsDdb);

AWSXRay.captureAWS(require("aws-sdk"));

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const apiRequestId = event.requestContext.requestId; //identifica a requisição no API Gateway
  const lambdaRequestId = context.awsRequestId; //identifica a chamada da função na AWS
  const method = event.httpMethod;

  console.log(`API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`); //log para acompanhamento do serviço no cloudWatch

  if (event.resource === "/products") {
    if (method === "GET") {
      console.log("GET /products");
      const products = await productRepository.getAllProducts();

      return {
        statusCode: 200,
        body: JSON.stringify(products),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;
    console.log(`GET / products/${productId}`);

    try {
      const product = await productRepository.getProductById(productId);

      return {
        statusCode: 200,
        body: JSON.stringify(product),
      };
    } catch (error) {
      console.error((error as Error).message);
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: (error as Error).message,
        }),
      };
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad request",
    }),
  };
}
