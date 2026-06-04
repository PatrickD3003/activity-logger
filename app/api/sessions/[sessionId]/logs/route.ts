import { NextRequest, NextResponse } from "next/server";
import { requireSimpleAuth } from "@/lib/auth";
import { deleteLogsForSession, getLogStorageName, isServerLogStorageConfigured, listLogs } from "@/lib/logRepository";

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  if (!isServerLogStorageConfigured()) {
    return NextResponse.json({ logs: [], storage: "local", message: "Server log storage is not configured" });
  }

  const logs = await listLogs({ sessionId: params.sessionId });
  return NextResponse.json({ logs, storage: getLogStorageName() });
}

export async function DELETE(request: NextRequest, { params }: { params: { sessionId: string } }) {
  const authError = requireSimpleAuth(request, "operator");
  if (authError) return authError;

  if (!isServerLogStorageConfigured()) {
    return NextResponse.json({ deleted: 0, storage: "local", message: "Server log storage is not configured" }, { status: 202 });
  }

  const deleted = await deleteLogsForSession(params.sessionId);
  return NextResponse.json({ deleted, storage: getLogStorageName() });
}
