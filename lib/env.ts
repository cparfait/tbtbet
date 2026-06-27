import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL est requis"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET doit faire au moins 16 caractères"),
  // NextAuth accepte AUTH_URL ou NEXTAUTH_URL selon la version
  AUTH_URL: z.string().url().optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  // Optionnels
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL doit être un email valide").optional(),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD doit faire au moins 8 caractères").optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const errors = result.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Variables d'environnement invalides :\n${errors}`);
}

export const env = result.data;
