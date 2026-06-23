/**
 * TBT Bet — Seed de développement
 * Crée un admin + quelques équipes et poules pour tester.
 */

import { PrismaClient } from "../lib/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed TBT Bet...");

  // Admin
  const adminEmail = process.env.ADMIN_EMAIL || "admin@tbtbet.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", passwordHash },
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`✅ Admin: ${adminEmail}`);

  // Poules
  const poolA = await prisma.pool.create({ data: { name: "Poule A" } });
  const poolB = await prisma.pool.create({ data: { name: "Poule B" } });

  // Équipes
  const teams = [
    { name: "Les Frappeurs", player1: "Alice", player2: "Bob", poolId: poolA.id },
    { name: "Babyfoot FC", player1: "Charlie", player2: "Diana", poolId: poolA.id },
    { name: "Les Artilleurs", player1: "Eve", player2: "Frank", poolId: poolA.id },
    { name: "Goal Getters", player1: "Grace", player2: "Hank", poolId: poolA.id },
    { name: "Tir Cadré", player1: "Ivy", player2: "Jack", poolId: poolA.id },
    { name: "Les Démineurs", player1: "Kate", player2: "Leo", poolId: poolB.id },
    { name: "Rouge & Noir", player1: "Mia", player2: "Noah", poolId: poolB.id },
    { name: "Les Fonceurs", player1: "Olivia", player2: "Pete", poolId: poolB.id },
    { name: "Babyfoot United", player1: "Quinn", player2: "Rose", poolId: poolB.id },
    { name: "La Défense", player1: "Sam", player2: "Tina", poolId: poolB.id },
  ];

  for (const t of teams) {
    await prisma.team.create({ data: t });
  }
  console.log(`✅ ${teams.length} équipes créées`);

  console.log("🎉 Seed terminé !");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());