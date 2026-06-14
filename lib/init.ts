import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { SYSTEM_USER_EMAIL, SYSTEM_USER_NAME } from "./match-recap";

const BADGES = [
  { key: "premier_pas", label: "Premier pas", emoji: "👣", description: "Ton tout premier pronostic." },
  { key: "nostradamus", label: "Nostradamus", emoji: "🔮", description: "3 scores exacts consécutifs." },
  { key: "en_feu", label: "En feu", emoji: "🔥", description: "5 bons résultats d'affilée." },
  { key: "perfectionniste", label: "Le Perfectionniste", emoji: "💎", description: "Un score exact avec le Joker." },
  { key: "assidu", label: "L'Assidu", emoji: "📅", description: "Tous les matchs d'une journée pronostiqués." },
  { key: "meme_pas_mal", label: "Même pas mal", emoji: "💀", description: "0 pt sur une journée complète." },
  { key: "sniper", label: "Sniper", emoji: "🎯", description: "10 scores exacts au total." },
  { key: "demi_centurion", label: "Cinquantenaire", emoji: "🎖️", description: "50 points au total." },
  { key: "centurion", label: "Centurion", emoji: "💯", description: "100 points au total." },
  { key: "daronissime", label: "Le Daronissime", emoji: "👑", description: "1ʳᵉ place en fin de tournoi." },
];

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
    // Auto-réparation : garantit le rôle ADMIN + mot de passe = ADMIN_PASSWORD.
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
      score: { create: {} },
    },
  });
  console.log(`[init] compte admin créé (${email})`);
}

/**
 * Compte « système » DaronsFC — auteur des récaps auto postés dans les tchats.
 * `banned: true` le tient hors des classements et listes de membres (défensif :
 * il n'est de toute façon membre d'aucun groupe).
 */
async function bootstrapSystemUser(): Promise<void> {
  await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: { name: SYSTEM_USER_NAME },
    create: {
      email: SYSTEM_USER_EMAIL,
      name: SYSTEM_USER_NAME,
      role: "USER",
      banned: true,
    },
  });
}

let done = false;

export async function maybeInit(): Promise<void> {
  if (done) return;
  done = true;
  try {
    for (const badge of BADGES) {
      await prisma.badge.upsert({ where: { key: badge.key }, update: badge, create: badge });
    }
  } catch (e) {
    console.error("[init] échec seed badges:", e instanceof Error ? e.message : e);
  }
  try {
    await bootstrapAdmin();
  } catch (e) {
    console.error("[init] échec bootstrap admin:", e instanceof Error ? e.message : e);
  }
  try {
    await bootstrapSystemUser();
  } catch (e) {
    console.error("[init] échec bootstrap bot système:", e instanceof Error ? e.message : e);
  }
}
