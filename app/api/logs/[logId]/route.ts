import { NextRequest, NextResponse } from "next/server";
import { requireSimpleAuth } from "@/lib/auth";
import { deleteLog, getLogStorageName, isServerLogStorageConfigured, updateLog } from "@/lib/logRepository";

export async function PATCH(request: NextRequest, { params }: { params: { logId: string } }) {
  const authError = requireSimpleAuth(request, "operator");
  if (authError) return authError;

  const payload = await request.json();

  if (!isServerLogStorageConfigured()) {
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

  return NextResponse.json({ log, storage: getLogStorageName() });
}

export async function DELETE(request: NextRequest, { params }: { params: { logId: string } }) {
  const authError = requireSimpleAuth(request, "operator");
  if (authError) return authError;

  if (!isServerLogStorageConfigured()) {
    return NextResponse.json({ logId: params.logId, storage: "local" }, { status: 202 });
  }

  await deleteLog(params.logId);
  return NextResponse.json({ logId: params.logId, storage: getLogStorageName() });
}
