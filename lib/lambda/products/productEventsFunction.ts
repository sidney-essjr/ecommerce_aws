import { Callback, Context } from "aws-lambda";
import { DynamoDB } from "aws-sdk";
import * as AWSXRay from "aws-xray-sdk";
import { ProductEvent } from "/opt/nodejs/productEventsLayer";

AWSXRay.captureAWS(require("aws-sdk"));

const eventsDdb = process.env.EVENTS_DDB!;
const ddbClient = new DynamoDB.DocumentClient();

export async function handler(
  event: ProductEvent,
  context: Context,
  callback: Callback
): Promise<void> {
  console.log(event);
  console.log(`Lambda requestId: ${context.awsRequestId}`);

  await createEvent(event);

  callback(null, {
    statusCode: 200,
    body: JSON.stringify({
      productEventCreated: true,
      message: "Event successfully registered",
    }),
  });
}

async function createEvent(event: ProductEvent) {
  try {
    const timestamp = Date.now();
    const ttl = ~~(timestamp / 1000) + 5 * 60;

    await ddbClient
      .put({
        TableName: eventsDdb,
        Item: {
          pk: `#product_${event.productCode}`,
          sk: `${event.eventType}#${timestamp}`,
          email: event.email,
          createAt: timestamp,
          requestId: event.requestId,
          eventType: event.eventType,
          info: {
            productId: event.productId,
            price: event.productPrice,
          },
          ttl: ttl,
        },
      })
      .promise();
  } catch (error) {
    console.error("Error creating event in DynamoDB:", error);
    throw new Error("Failed to create event");
  }
}
