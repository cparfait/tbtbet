import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CredentialsForm, GoogleSignInButton } from "@/components/auth-buttons";

/** Garde-fou : n'autorise que des chemins internes (anti open-redirect). */
function safeNext(next?: string): string {
  return next && next.startsWith("/") && !next.startsWith("//")
    ? next
    : "/dashboard";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const dest = safeNext(next);
  const session = await auth();
  if (session?.user) redirect(dest);

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      {/* ── Animated background ────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[var(--color-bg)]" />
        <div
          className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.07] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full opacity-[0.05] blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-cream) 1px, transparent 1px), linear-gradient(90deg, var(--color-cream) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Card ───────────────────────────────────── */}
      <div className="animate-stagger stagger-1 relative z-10 flex w-full max-w-md flex-col">
        <div className="glass-strong rounded-3xl p-8 shadow-2xl shadow-black/40">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition-colors duration-200 hover:text-[var(--color-cream)]"
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Retour
          </Link>

          <div className="mb-8">
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-cream)]">
              Connexion
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              Rejoins le tournoi et fais tes pronostics.
            </p>
          </div>

          {/* Google sign-in */}
          <GoogleSignInButton className="w-full" callbackUrl={dest} />

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">
              ou
            </span>
            <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
          </div>

          {/* Credentials form */}
          <CredentialsForm next={dest} />

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--color-accent-bright)] transition-colors duration-200 hover:text-[var(--color-accent)] hover:underline"
            >
              Inscris-toi
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}