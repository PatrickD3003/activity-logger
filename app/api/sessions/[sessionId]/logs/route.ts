import { NextResponse } from "next/server";
import { isDynamoConfigured, listLogs } from "@/lib/dynamodb";

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  if (!isDynamoConfigured()) {
    return NextResponse.json({ logs: [], storage: "local", message: "DynamoDB is not configured" });
  }

  const logs = await listLogs({ sessionId: params.sessionId });
  return NextResponse.json({ logs, storage: "dynamodb" });
}
