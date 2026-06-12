import Link from "next/link";
import { TriangleAlert, Users } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/components/auth-buttons";
import { JoinGroupButton } from "@/components/join-group-button";

export const dynamic = "force-dynamic";

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth();

  let group: { id: string; name: string; memberCount: number } | null = null;
  try {
    const g = await prisma.group.findUnique({
      where: { token },
      select: { id: true, name: true, _count: { select: { members: true } } },
    });
    if (g) group = { id: g.id, name: g.name, memberCount: g._count.members };
  } catch {}

  // Utilisateur connecté : déjà membre ?
  let alreadyMember = false;
  if (group && session?.user?.id) {
    try {
      const m = await prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: group.id, userId: session.user.id } },
      });
      alreadyMember = !!m;
    } catch {}
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[var(--color-bg)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-black/40">
          {!group ? (
            <div className="text-center">
              <TriangleAlert className="mx-auto mb-3 size-10 text-[var(--color-gold)]" />
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
                Lien de groupe invalide
              </h1>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Ce lien d&apos;invitation ne correspond à aucun groupe. Demande-en
                un nouveau à l&apos;organisateur.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-xl bg-[var(--color-pitch)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-pitch-bright)]"
              >
                Aller à la connexion
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-[var(--color-pitch)]/15">
                  <Users className="size-7 text-[var(--color-pitch-bright)]" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                  Invitation au groupe
                </p>
                <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                  {group.name}
                </h1>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                  {group.memberCount} membre{group.memberCount > 1 ? "s" : ""}
                </p>
              </div>

              {session?.user ? (
                <JoinGroupButton token={token} alreadyMember={alreadyMember} />
              ) : (
                <>
                  <p className="mb-4 text-center text-sm text-[var(--color-muted)]">
                    Crée ton compte pour rejoindre la bande et pronostiquer.
                  </p>
                  <RegisterForm groupToken={token} />
                  <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
                    Déjà un compte ?{" "}
                    <Link
                      href={`/login?next=/join/${token}`}
                      className="font-medium text-[var(--color-pitch-bright)] hover:underline"
                    >
                      Connecte-toi
                    </Link>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
