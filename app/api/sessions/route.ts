import { NextRequest, NextResponse } from "next/server";
import { requireSimpleAuth } from "@/lib/auth";
import { getLogStorageName, isServerLogStorageConfigured, listSessions, putSession } from "@/lib/logRepository";

export async function GET() {
  if (!isServerLogStorageConfigured()) {
    return NextResponse.json({ sessions: [], storage: "local", message: "Server log storage is not configured" });
  }

  const sessions = await listSessions();
  return NextResponse.json({ sessions, storage: getLogStorageName() });
}

export async function POST(request: NextRequest) {
  const authError = requireSimpleAuth(request, "operator");
  if (authError) return authError;

  const payload = await request.json();

  if (!payload.sessionId || !payload.division || !payload.operatorName || !payload.machineNumber || !payload.shiftDate) {
    return NextResponse.json({ error: "sessionId, division, operatorName, machineNumber, and shiftDate are required" }, { status: 400 });
  }

  if (!isServerLogStorageConfigured()) {
    return NextResponse.json({ session: payload, storage: "local", message: "Server log storage is not configured" }, { status: 202 });
  }

  const session = await putSession(payload);
  return NextResponse.json({ session, storage: getLogStorageName() }, { status: 201 });
}
