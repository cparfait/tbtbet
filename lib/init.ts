import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/**
 * Crée (ou promeut) le compte admin défini par les variables d'environnement
 * ADMIN_EMAIL + ADMIN_PASSWORD. Idempotent : le mot de passe n'est posé qu'à
 * la création, le rôle ADMIN est garanti à chaque démarrage.
 */
async function bootstrapAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log(
      `[init] admin NON configuré — ADMIN_EMAIL=${email ? "ok" : "MANQUANT"}, ADMIN_PASSWORD=${password ? "ok" : "MANQUANT"}`
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { role: "ADMIN", passwordHash, banned: false },
    });
    console.log(`[init] compte admin vérifié (${email})`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`[init] compte admin créé (${email})`);
}

let done = false;

export async function maybeInit(): Promise<void> {
  if (done) return;
  done = true;
  try {
    await bootstrapAdmin();
  } catch (e) {
    console.error("[init] échec bootstrap admin:", e instanceof Error ? e.message : e);
  }
}