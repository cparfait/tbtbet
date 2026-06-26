import { NextRequest, NextResponse } from "next/server";

/**
 * Efface les cookies de session NextAuth et redirige vers /login.
 * Utilisé quand un user authentifié (JWT valide) n'existe plus en base
 * (ex : rechargement de scénario) pour éviter la boucle ERR_TOO_MANY_REDIRECTS.
 */
export async function GET(req: NextRequest) {
  const loginUrl = new URL("/login", req.url);
  const res = NextResponse.redirect(loginUrl);

  const cookiesToClear = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
  ];
  for (const name of cookiesToClear) {
    res.cookies.set(name, "", { maxAge: 0, path: "/" });
  }
  return res;
}
