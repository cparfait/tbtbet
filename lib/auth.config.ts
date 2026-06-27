import type { NextAuthConfig } from "next-auth";

/**
 * Configuration edge-safe (sans adapter ni bcrypt) — utilisée par le
 * middleware. La config complète vit dans `lib/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  trustHost: true,
  session: { strategy: "jwt" },
  callbacks: {
    /** Protège les routes : seules les pages publiques sont accessibles sans session. */
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const publicPaths = ["/", "/login", "/register"];
      const isPublic =
        publicPaths.includes(nextUrl.pathname) ||
        nextUrl.pathname.startsWith("/api/auth") ||
        nextUrl.pathname.startsWith("/api/uploads") ||
        nextUrl.pathname.startsWith("/invite") ||
        nextUrl.pathname.startsWith("/join") ||
        nextUrl.pathname.startsWith("/api/register");

      if (isPublic) return true;
      if (isLoggedIn) return true;

      // Reverse proxy (NPM/Traefik) fournit les headers forwarded.
      // Le edge runtime ne peut pas lire les env vars Docker au runtime,
      // donc on reconstruit l'origine publique depuis ces headers.
      const proto = request.headers.get("x-forwarded-proto") ?? nextUrl.protocol.replace(":", "");
      const host  = request.headers.get("x-forwarded-host")  ?? nextUrl.host;
      const loginUrl = new URL("/login", `${proto}://${host}`);
      loginUrl.searchParams.set("next", nextUrl.pathname);
      return Response.redirect(loginUrl);
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role ?? "USER";
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      }
      return session;
    },
  },
  providers: [], // renseignés dans lib/auth.ts
} satisfies NextAuthConfig;
