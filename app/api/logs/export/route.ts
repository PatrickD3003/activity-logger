import { NextRequest, NextResponse } from "next/server";
import { requireSimpleAuth } from "@/lib/auth";
import { logsToCsv } from "@/lib/csv";
import { isServerLogStorageConfigured, listLogs } from "@/lib/logRepository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authError = requireSimpleAuth(request, "admin");
  if (authError) return authError;

  if (!isServerLogStorageConfigured()) {
    return new NextResponse("Server log storage is not configured. Use the in-app current session export for local logs.", {
      status: 202,
      headers: { "Content-Type": "text/plain" }
    });
  }

  const { searchParams } = new URL(request.url);
  const logs = await listLogs({
    date: searchParams.get("date") ?? undefined,
    division: searchParams.get("division") ?? undefined,
    machineNumber: searchParams.get("machineNumber") ?? undefined,
    operatorName: searchParams.get("operatorName") ?? undefined,
    sessionId: searchParams.get("sessionId") ?? undefined
  });
  const csv = logsToCsv(logs);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="factory-activity-logs.csv"`
    }
  });
}
