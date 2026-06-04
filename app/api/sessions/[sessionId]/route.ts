import { NextRequest, NextResponse } from "next/server";
import { requireSimpleAuth } from "@/lib/auth";
import { deleteLogsForSession, deleteSession, getLogStorageName, isServerLogStorageConfigured } from "@/lib/logRepository";

export async function DELETE(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const authError = requireSimpleAuth(request, "operator");
  if (authError) return authError;

  if (!isServerLogStorageConfigured()) {
    return NextResponse.json({ deletedLogs: 0, storage: "local", message: "Server log storage is not configured" }, { status: 202 });
  }

  const deletedLogs = await deleteLogsForSession(params.sessionId);
  await deleteSession(params.sessionId);

  return NextResponse.json({ deletedLogs, storage: getLogStorageName() });
}
