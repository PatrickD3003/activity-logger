import { NextRequest, NextResponse } from "next/server";
import { requireSimpleAuth } from "@/lib/auth";
import { deleteLog, isDynamoConfigured, updateLog } from "@/lib/dynamodb";

export async function PATCH(request: NextRequest, { params }: { params: { logId: string } }) {
  const authError = requireSimpleAuth(request, "operator");
  if (authError) return authError;

  const payload = await request.json();

  if (!isDynamoConfigured()) {
    return NextResponse.json({ logId: params.logId, patch: payload, storage: "local" }, { status: 202 });
  }

  const log = await updateLog(params.logId, {
    endTime: payload.endTime,
    durationSeconds: payload.durationSeconds,
    note: payload.note,
    operatorName: payload.operatorName,
    createdBy: payload.createdBy,
    updatedAt: payload.updatedAt
  });

  return NextResponse.json({ log, storage: "dynamodb" });
}

export async function DELETE(request: NextRequest, { params }: { params: { logId: string } }) {
  const authError = requireSimpleAuth(request, "operator");
  if (authError) return authError;

  if (!isDynamoConfigured()) {
    return NextResponse.json({ logId: params.logId, storage: "local" }, { status: 202 });
  }

  await deleteLog(params.logId);
  return NextResponse.json({ logId: params.logId, storage: "dynamodb" });
}
