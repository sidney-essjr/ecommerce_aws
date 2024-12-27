import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { DynamoDB, Lambda } from "aws-sdk";
import { ProductEvent, ProductEventType } from "/opt/nodejs/productEventsLayer";
import { Product, ProductRepository } from "/opt/nodejs/productsLayer";
import * as AWSXRay from "aws-xray-sdk";

const productsDdb = process.env.PRODUCTS_DDB!;
const productEventsFunctionName = process.env.PRODUCT_EVENTS_FUNCTION_NAME!;

const ddbClient = new DynamoDB.DocumentClient();
const lambdaClient = new Lambda();
const productRepository = new ProductRepository(ddbClient, productsDdb);

AWSXRay.captureAWS(require("aws-sdk"));

export async function handler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const apiRequestId = event.requestContext.requestId;
  const lambdaRequestId = context.awsRequestId;
  const method = event.httpMethod;

  console.log(`API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`); //log para acompanhamento do serviço no cloudWatch

  if (event.resource === "/products") {
    console.log("POST /products");
    const product = JSON.parse(event.body!) as Product;

    try {
      const productCreated = await productRepository.createProduct(product);

      sendProductEvent(
        productCreated,
        ProductEventType.CREATED,
        "usuario@email.com",
        lambdaRequestId
      );

      return {
        statusCode: 201,
        body: JSON.stringify(productCreated),
      };
    } catch (error) {
      console.error((error as Error).message);
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: (error as Error).message,
        }),
      };
    }
  } else if (event.resource === "/products/{id}") {
    const productId = event.pathParameters!.id as string;

    if (method === "PUT") {
      console.log(`PUT / products/${productId}`);
      const product = JSON.parse(event.body!) as Product;
      try {
        const productUpdated = await productRepository.updateProduct(productId, product);

        sendProductEvent(
          productUpdated,
          ProductEventType.UPDATED,
          "usuario@email.com",
          lambdaRequestId
        );

        return {
          statusCode: 200,
          body: JSON.stringify(productUpdated),
        };
      } catch (error) {
        console.error((error as Error).message);
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: (error as Error).message,
          }),
        };
      }
    } else if (method === "DELETE") {
      console.log(`DELETE / products/${productId}`);

      try {
        const productDeleted = await productRepository.deleteProduct(productId);

        sendProductEvent(
          productDeleted,
          ProductEventType.DELETED,
          "usuario@email.com",
          lambdaRequestId
        );

        return {
          statusCode: 200,
          body: JSON.stringify(productDeleted),
        };
      } catch (error) {
        console.error((error as Error).message);
        return {
          statusCode: 400,
          body: JSON.stringify({
            message: (error as Error).message,
          }),
        };
      }
    }
  }

  return {
    statusCode: 400,
    body: JSON.stringify({
      message: "Bad request",
    }),
  };
}

function sendProductEvent(
  product: Product,
  eventType: ProductEventType,
  email: string,
  lambdaRequestId: string
) {
  const event: ProductEvent = {
    email: email,
    eventType: eventType,
    productCode: product.code,
    productId: product.id,
    productPrice: product.price,
    requestId: lambdaRequestId,
  };

  try {
    return lambdaClient.invoke({
        FunctionName: productEventsFunctionName,
        Payload: JSON.stringify(event),
        InvocationType: "RequestResponse", //invocação sincrona
      }).promise();
  } catch (error) {
    console.error("Error invoking Lambda function:", error);
    throw new Error(`Failed to invoke lambda function: ${productEventsFunctionName}`);
  }
}
