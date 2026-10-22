import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose/jwt/verify";
import { SESSION_COOKIE } from "@/lib/auth/constants";

// Fast path only: bounce signed-out visitors away from /admin pages before
// any rendering. The REAL security check is requireUser() inside every admin
// page and server action (docs/04-admin.md §2) — never rely on this alone.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const secret = process.env.AUTH_SECRET;
  // Not configured yet: let the page explain what's missing.
  if (!secret) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });
      return NextResponse.next();
    } catch {
      /* fall through to login */
    }
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = pathname === "/admin" ? "" : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
