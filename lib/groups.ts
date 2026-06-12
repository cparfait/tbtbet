// ─────────────────────────────────────────────
// Groupes d'amis — helpers serveur.
//
// Un pronostic est GLOBAL (un par match) : le groupe ne change que le
// classement affiché (entre membres) et le tchat. Le groupe actif est mémorisé
// dans un cookie.
// ─────────────────────────────────────────────

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const GROUP_COOKIE = "daronsfc_group";

export type GroupBrief = {
  id: string;
  name: string;
  token: string;
  memberCount: number;
  isOwner: boolean;
};

/** Génère un token d'invitation de groupe (URL-safe). */
export function newGroupToken(): string {
  return randomUUID().replace(/-/g, "");
}

/** Groupes auxquels appartient l'utilisateur (du plus ancien au plus récent). */
export async function getMyGroups(userId: string): Promise<GroupBrief[]> {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: {
        group: { include: { _count: { select: { members: true } } } },
      },
      orderBy: { joinedAt: "asc" },
    });
    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      token: m.group.token,
      memberCount: m.group._count.members,
      isOwner: m.role === "OWNER",
    }));
  } catch {
    return [];
  }
}

/**
 * Groupe actif de l'utilisateur : valeur du cookie si l'utilisateur en est
 * membre, sinon son premier groupe, sinon null (aucun groupe).
 */
export async function getActiveGroup(userId: string): Promise<GroupBrief | null> {
  const groups = await getMyGroups(userId);
  if (groups.length === 0) return null;
  const jar = await cookies();
  const wanted = jar.get(GROUP_COOKIE)?.value;
  return groups.find((g) => g.id === wanted) ?? groups[0]!;
}

/**
 * Renvoie le groupe actif, ou redirige vers `/groups` si l'utilisateur n'a
 * encore aucun groupe (à appeler depuis les pages scopées par groupe).
 */
export async function requireActiveGroup(userId: string): Promise<GroupBrief> {
  const active = await getActiveGroup(userId);
  if (!active) redirect("/groups");
  return active;
}

/** Ids des membres d'un groupe (pour filtrer un classement). */
export async function getGroupMemberIds(groupId: string): Promise<string[]> {
  try {
    const members = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  } catch {
    return [];
  }
}
