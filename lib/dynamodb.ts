import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { ActivityLog, LogInput } from "@/lib/types";

const tableName = process.env.DYNAMODB_LOGS_TABLE;

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region: process.env.AWS_REGION ?? "ap-southeast-1"
  })
);

export function isDynamoConfigured() {
  return Boolean(tableName);
}

export async function putLog(input: LogInput) {
  if (!tableName) throw new Error("DYNAMODB_LOGS_TABLE is not configured");
  const now = new Date().toISOString();
  const log: ActivityLog = {
    ...input,
    logId: input.logId ?? crypto.randomUUID(),
    createdAt: now,
    updatedAt: now
  };
  await client.send(new PutCommand({ TableName: tableName, Item: log }));
  return log;
}

export async function updateLog(
  logId: string,
  patch: Partial<Pick<ActivityLog, "note" | "operatorName" | "createdBy" | "updatedAt">> & {
    endTime?: string | null;
    durationSeconds?: number | null;
  }
) {
  if (!tableName) throw new Error("DYNAMODB_LOGS_TABLE is not configured");
  const names: Record<string, string> = { "#updatedAt": "updatedAt" };
  const values: Record<string, unknown> = { ":updatedAt": patch.updatedAt ?? new Date().toISOString() };
  const sets = ["#updatedAt = :updatedAt"];
  const removes: string[] = [];

  Object.entries(patch).forEach(([key, value]) => {
    if (key === "updatedAt") return;
    if (value === undefined) return;
    names[`#${key}`] = key;
    if (value === null) {
      removes.push(`#${key}`);
      return;
    }
    values[`:${key}`] = value;
    sets.push(`#${key} = :${key}`);
  });

  const updateExpression = [`SET ${sets.join(", ")}`, removes.length ? `REMOVE ${removes.join(", ")}` : ""]
    .filter(Boolean)
    .join(" ");

  const result = await client.send(
    new UpdateCommand({
      TableName: tableName,
      Key: { logId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW"
    })
  );

  return result.Attributes as ActivityLog;
}

export async function deleteLog(logId: string) {
  if (!tableName) throw new Error("DYNAMODB_LOGS_TABLE is not configured");
  await client.send(new DeleteCommand({ TableName: tableName, Key: { logId } }));
}

export async function listLogs(filters: {
  sessionId?: string;
  division?: string;
  operatorName?: string;
  machineNumber?: string;
  date?: string;
}) {
  if (!tableName) throw new Error("DYNAMODB_LOGS_TABLE is not configured");

  if (filters.sessionId) {
    const result = await client.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "sessionId-startTime-index",
        KeyConditionExpression: "sessionId = :sessionId",
        ExpressionAttributeValues: { ":sessionId": filters.sessionId },
        ScanIndexForward: true
      })
    );
    return (result.Items ?? []) as ActivityLog[];
  }

  const result = await client.send(new ScanCommand({ TableName: tableName }));
  return ((result.Items ?? []) as ActivityLog[]).filter((log) => {
    if (filters.division && log.division !== filters.division) return false;
    if (filters.operatorName && log.operatorName !== filters.operatorName) return false;
    if (filters.machineNumber && log.machineNumber !== filters.machineNumber) return false;
    if (filters.date && !log.startTime.startsWith(filters.date)) return false;
    return true;
  });
}
