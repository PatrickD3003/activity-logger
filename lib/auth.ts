import { NextRequest, NextResponse } from "next/server";

type Role = "operator" | "admin";

export function requireSimpleAuth(request: NextRequest, role: Role) {
  if (process.env.APP_AUTH_MODE !== "simple") return undefined;

  const operatorPin = process.env.APP_OPERATOR_PIN;
  const adminPin = process.env.APP_ADMIN_PIN;
  const providedPin = request.headers.get("x-operator-pin") ?? request.headers.get("x-admin-pin");
  const allowedPins = role === "admin" ? [adminPin].filter(Boolean) : [operatorPin, adminPin].filter(Boolean);

  if (allowedPins.length === 0) {
    return NextResponse.json({ error: "Simple auth is enabled but no PIN is configured" }, { status: 500 });
  }

  if (!providedPin || !allowedPins.includes(providedPin)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return undefined;
}
