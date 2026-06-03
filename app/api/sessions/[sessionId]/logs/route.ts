import { NextResponse } from "next/server";
import { getLogStorageName, isServerLogStorageConfigured, listLogs } from "@/lib/logRepository";

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  if (!isServerLogStorageConfigured()) {
    return NextResponse.json({ logs: [], storage: "local", message: "Server log storage is not configured" });
  }

  const logs = await listLogs({ sessionId: params.sessionId });
  return NextResponse.json({ logs, storage: getLogStorageName() });
}
