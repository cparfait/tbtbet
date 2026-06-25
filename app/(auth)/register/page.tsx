import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { RegisterForm, GoogleSignInButton } from "@/components/auth-buttons";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-8">
      {/* ── Animated background ────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[var(--color-bg)]" />
        <div
          className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full opacity-[0.06] blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full opacity-[0.06] blur-[100px]"
          style={{
            background:
              "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)",
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
            href="/login"
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
            Retour à la connexion
          </Link>

          <div className="mb-8">
            <div className="mb-5">
              <Image
                src="/logo.png"
                alt="TBT Bet"
                width={80}
                height={80}
                priority
                className="rounded-2xl shadow-lg shadow-[var(--color-accent)]/20 ring-1 ring-white/10"
              />
            </div>

            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--color-cream)]">
              Inscription
            </h1>
            <p className="mt-1.5 text-sm text-[var(--color-muted)]">
              Crée ton compte et commence à parier.
            </p>
          </div>

          {/* Google sign-in */}
          <GoogleSignInButton className="w-full" />

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted)]">ou</span>
            <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
          </div>

          {/* Register form */}
          <RegisterForm />

          {/* Login link */}
          <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
            Déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-medium text-[var(--color-accent-bright)] transition-colors duration-200 hover:text-[var(--color-accent)] hover:underline"
            >
              Connecte-toi
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-muted)]/60">
          En créant un compte, tu obtiens 100 Wiz et 2 Bonus ×2 pour parier.
        </p>
      </div>
    </main>
  );
}