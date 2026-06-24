import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

// L'identifiant accepte un email OU un nom d'utilisateur (ex. "admin").
const credentialsSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Enrichit le callback jwt edge-safe : re-lit le rôle en base au plus une
     * fois par minute, pour qu'une promotion/rétrogradation admin prenne effet
     * sans attendre la reconnexion (le rôle vit sinon figé dans le JWT).
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role ?? "USER";
        token.roleCheckedAt = Date.now();
        return token;
      }
      const checkedAt = (token.roleCheckedAt as number | undefined) ?? 0;
      const userId = token.id as string | undefined;
      if (userId && Date.now() - checkedAt > 60_000) {
        token.roleCheckedAt = Date.now();
        try {
          const u = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
          });
          if (u) token.role = u.role;
        } catch {
          // Base injoignable : on garde le rôle du token.
        }
      }
      return token;
    },
  },
  adapter: PrismaAdapter(prisma),
  events: {
    async signIn() {
      // TBT Bet : pas de sync API externe
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.banned) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl ?? user.image,
          role: user.role,
        };
      },
    }),
  ],
});
