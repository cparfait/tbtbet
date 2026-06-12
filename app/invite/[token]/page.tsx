import Link from "next/link";
import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegisterForm } from "@/components/auth-buttons";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { token } = await params;
  let valid = false;
  try {
    const invite = await prisma.invite.findUnique({ where: { token } });
    valid =
      !!invite &&
      (!invite.expiresAt || invite.expiresAt >= new Date()) &&
      (invite.usesLeft == null || invite.usesLeft > 0);
  } catch {}

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[var(--color-bg)]" />
      <div className="relative z-10 w-full max-w-md">
        <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-black/40">
          {valid ? (
            <>
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 text-4xl">🥒🏆</div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
                  Tu es invité chez les Darons !
                </h1>
                <p className="mt-1.5 text-sm text-[var(--color-muted)]">
                  Crée ton compte pour rejoindre la bande et pronostiquer.
                </p>
              </div>
              <RegisterForm inviteToken={token} />
              <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
                Déjà un compte ?{" "}
                <Link
                  href="/login"
                  className="font-medium text-[var(--color-pitch-bright)] hover:underline"
                >
                  Connecte-toi
                </Link>
              </p>
            </>
          ) : (
            <div className="text-center">
              <TriangleAlert className="mx-auto mb-3 size-10 text-[var(--color-gold)]" />
              <h1 className="font-[family-name:var(--font-display)] text-xl font-bold">
                Invitation invalide
              </h1>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                Ce lien d&apos;invitation est expiré ou a déjà été utilisé.
                Demande-en un nouveau à l&apos;organisateur.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-block rounded-xl bg-[var(--color-pitch)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-pitch-bright)]"
              >
                Aller à la connexion
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
