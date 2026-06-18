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
  /** false = l'utilisateur n'est pas membre (admin en consultation). */
  isMember: boolean;
};

/** Groupe actif + indicateur de lecture seule (admin sur un groupe non-membre). */
export type ActiveGroup = GroupBrief & { readOnly: boolean };

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
      isMember: true,
    }));
  } catch {
    return [];
  }
}

/**
 * Groupes proposables dans le sélecteur. Pour un ADMIN : tous les groupes (ceux
 * dont il n'est pas membre sont marqués `isMember:false` → parcourus en lecture
 * seule). Pour un membre normal : uniquement ses groupes.
 */
export async function getSwitchableGroups(
  userId: string,
  isAdmin: boolean
): Promise<GroupBrief[]> {
  const mine = await getMyGroups(userId);
  if (!isAdmin) return mine;
  try {
    const all = await prisma.group.findMany({
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: "asc" },
    });
    const mineIds = new Set(mine.map((g) => g.id));
    const others = all
      .filter((g) => !mineIds.has(g.id))
      .map((g) => ({
        id: g.id,
        name: g.name,
        token: g.token,
        memberCount: g._count.members,
        isOwner: false,
        isMember: false,
      }));
    return [...mine, ...others];
  } catch {
    return mine;
  }
}

/**
 * Groupe actif de l'utilisateur : valeur du cookie si l'utilisateur en est
 * membre, sinon son premier groupe, sinon null (aucun groupe).
 */
export async function getActiveGroup(userId: string): Promise<ActiveGroup | null> {
  const groups = await getMyGroups(userId);
  const jar = await cookies();
  const wanted = jar.get(GROUP_COOKIE)?.value;

  // Cas normal : le groupe demandé fait partie des siens.
  const mine = groups.find((g) => g.id === wanted);
  if (mine) return { ...mine, readOnly: false };

  // Admin pointant vers un groupe dont il n'est pas membre → consultation
  // en lecture seule (parcours « comme un membre », sans pouvoir écrire).
  if (wanted) {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (me?.role === "ADMIN") {
      const g = await prisma.group.findUnique({
        where: { id: wanted },
        include: { _count: { select: { members: true } } },
      });
      if (g) {
        return {
          id: g.id,
          name: g.name,
          token: g.token,
          memberCount: g._count.members,
          isOwner: false,
          isMember: false,
          readOnly: true,
        };
      }
    }
  }

  // Repli : premier groupe du membre, ou aucun groupe.
  if (groups.length === 0) return null;
  return { ...groups[0]!, readOnly: false };
}

/**
 * Renvoie le groupe actif, ou redirige vers `/groups` si l'utilisateur n'a
 * encore aucun groupe (à appeler depuis les pages scopées par groupe).
 */
export async function requireActiveGroup(userId: string): Promise<ActiveGroup> {
  const active = await getActiveGroup(userId);
  if (!active) redirect("/groups");
  return active;
}

/**
 * À appeler AVANT de supprimer un compte : pour chaque groupe dont
 * l'utilisateur est OWNER, transmet la propriété au plus ancien autre membre.
 * Si le groupe n'a aucun autre membre, il est supprimé (avec ses messages) —
 * sinon il resterait un groupe fantôme inaccessible.
 */
export async function reassignOwnedGroups(userId: string): Promise<void> {
  const owned = await prisma.groupMember.findMany({
    where: { userId, role: "OWNER" },
    select: { groupId: true },
  });
  for (const { groupId } of owned) {
    const heir = await prisma.groupMember.findFirst({
      where: { groupId, userId: { not: userId } },
      orderBy: { joinedAt: "asc" },
      select: { userId: true },
    });
    if (heir) {
      await prisma.groupMember.update({
        where: { groupId_userId: { groupId, userId: heir.userId } },
        data: { role: "OWNER" },
      });
    } else {
      await prisma.group.delete({ where: { id: groupId } });
    }
  }
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

/**
 * Ids de TOUS les joueurs non bannis (pour le classement général de l'appli).
 * On exclut le compte système (bot) et les admins peuvent voir tout le monde.
 */
export async function getAllPlayerIds(): Promise<string[]> {
  try {
    const users = await prisma.user.findMany({
      where: { banned: false },
      select: { id: true },
    });
    return users.map((u) => u.id);
  } catch {
    return [];
  }
}

/** Noms des groupes publics d'un joueur (pour affichage sur sa fiche). */
export async function getUserPublicGroups(
  userId: string
): Promise<{ id: string; name: string }[]> {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: { userId },
      include: { group: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    });
    return memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
    }));
  } catch {
    return [];
  }
}
