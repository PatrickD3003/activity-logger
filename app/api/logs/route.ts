import { NextRequest, NextResponse } from "next/server";
import { requireSimpleAuth } from "@/lib/auth";
import { isDynamoConfigured, listLogs, putLog } from "@/lib/dynamodb";

export async function GET(request: NextRequest) {
  if (!isDynamoConfigured()) {
    return NextResponse.json({ logs: [], storage: "local", message: "DynamoDB is not configured" });
  }

  const { searchParams } = new URL(request.url);
  const logs = await listLogs({
    date: searchParams.get("date") ?? undefined,
    division: searchParams.get("division") ?? undefined,
    machineNumber: searchParams.get("machineNumber") ?? undefined,
    operatorName: searchParams.get("operatorName") ?? undefined,
    sessionId: searchParams.get("sessionId") ?? undefined
  });

  return NextResponse.json({ logs, storage: "dynamodb" });
}

export async function POST(request: NextRequest) {
  const authError = requireSimpleAuth(request, "operator");
  if (authError) return authError;

  const payload = await request.json();

  if (!payload.sessionId || !payload.activityCode || !payload.startTime) {
    return NextResponse.json({ error: "sessionId, activityCode, and startTime are required" }, { status: 400 });
  }

  if (!isDynamoConfigured()) {
    return NextResponse.json({ log: payload, storage: "local", message: "DynamoDB is not configured" }, { status: 202 });
  }

  const log = await putLog(payload);
  return NextResponse.json({ log, storage: "dynamodb" }, { status: 201 });
}
