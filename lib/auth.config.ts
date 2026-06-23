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
    authorized({ auth, request: { nextUrl } }) {
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
      return isLoggedIn;
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
