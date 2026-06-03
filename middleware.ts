import { NextRequest, NextResponse } from "next/server";

const REALM = "Factory Activity Logger";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`
    }
  });
}

function decodeBasicAuth(header: string) {
  const [scheme, value] = header.split(" ");
  if (scheme !== "Basic" || !value) return undefined;

  try {
    const decoded = atob(value);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return undefined;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1)
    };
  } catch {
    return undefined;
  }
}

export function middleware(request: NextRequest) {
  if (process.env.APP_AUTH_MODE !== "basic") return NextResponse.next();

  const expectedUsername = process.env.APP_BASIC_USERNAME;
  const expectedPassword = process.env.APP_BASIC_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return new NextResponse("Basic auth is enabled but credentials are not configured", { status: 500 });
  }

  const credentials = decodeBasicAuth(request.headers.get("authorization") ?? "");

  if (credentials?.username !== expectedUsername || credentials.password !== expectedPassword) {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icon.svg).*)"]
};
