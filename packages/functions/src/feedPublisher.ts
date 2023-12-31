import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { dbClient } from "./utils/dbClient";
import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { Table } from "sst/node/table";
import { Queue } from "sst/node/queue";

const sqs = new SQSClient({
  region: "ap-southeast-2",
});

export async function main() {
  const scanCommand = new ScanCommand({
    TableName: Table.publisher.tableName,
    ProjectionExpression: "id, publisherName, feedUrl, feedType, publisherUrl, logo, primaryTag",
    FilterExpression: "feedStatus = :status",
    ExpressionAttributeValues: {
      ":status": { S: "active" },
    },
  });

  const result = await dbClient.send(scanCommand);
  if (!result.Items) {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "no items" }),
    };
  }
  for (const publisher of result.Items) {
    const msgBody = { 
      id: publisher.id,
      feedUrl: publisher.feedUrl.S,
      publisher: publisher.publisherName.S,
      tag: publisher.primaryTag.S,
      feedType: publisher.feedType.S,
    };
    const params = {
      MessageBody: JSON.stringify(msgBody),
      QueueUrl: Queue.Queue.queueUrl,
    };
    await sqs.send(new SendMessageCommand(params));
    console.log("Sent message to queue", params);
  }
  return {
    statusCode: 200,
    body: JSON.stringify({ status: "successful" }),
  };
}
