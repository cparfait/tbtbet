"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, Mail, Lock, Eye, EyeOff, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

/* ────────────────────────────────────────────
   Shared styles
   ──────────────────────────────────────────── */

const inputBase =
  "h-12 w-full rounded-xl border bg-[var(--color-surface)] px-4 pl-11 text-sm text-[var(--color-cream)] placeholder:text-[var(--color-muted)] outline-none transition-all duration-200 focus:border-[var(--color-pitch)] focus:ring-2 focus:ring-[var(--color-pitch)]/20";

const inputNormal = "border-[var(--color-border-subtle)]";

/* ────────────────────────────────────────────
   Google SVG Icon
   ──────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────
   GoogleSignInButton
   ──────────────────────────────────────────── */

export function GoogleSignInButton({
  className,
  label = "Continuer avec Google",
}: {
  className?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl: "/dashboard" });
      }}
      className={
        `group relative flex h-12 w-full items-center justify-center gap-3 rounded-xl
         border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]
         text-sm font-medium text-[var(--color-cream)] transition-all duration-200
         hover:border-[var(--color-border-medium)] hover:bg-[var(--color-surface-3)]
         active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ` +
        (className ?? "")
      }
    >
      {loading ? (
        <Loader2 className="size-5 animate-spin text-[var(--color-muted)]" />
      ) : (
        <GoogleIcon />
      )}
      {loading ? "Redirection..." : label}
    </button>
  );
}

/* ────────────────────────────────────────────
   CredentialsForm (Login)
   ──────────────────────────────────────────── */

export function CredentialsForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const data = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: data.get("email"),
      password: data.get("password"),
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Email */}
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ton@email.fr"
          className={`${inputBase} ${inputNormal}`}
        />
      </div>

      {/* Password */}
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          autoComplete="current-password"
          placeholder="Mot de passe"
          className={`${inputBase} ${inputNormal} pr-11`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-[slide-down_0.3s_ease-out]">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="mt-1 h-12 w-full rounded-xl bg-[var(--color-pitch)] text-white font-semibold transition-all duration-200 hover:bg-[var(--color-pitch-bright)] hover:shadow-lg hover:shadow-[var(--color-pitch)]/25 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Connexion en cours...
          </span>
        ) : (
          "Se connecter"
        )}
      </Button>
    </form>
  );
}

/* ────────────────────────────────────────────
   RegisterForm
   ──────────────────────────────────────────── */

export function RegisterForm({ inviteToken }: { inviteToken?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const data = new FormData(e.currentTarget);
    const name = data.get("name") as string;
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const confirm = data.get("confirm") as string;

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, inviteToken }),
      });

      const body = await res.json();

      if (!res.ok) {
        setError(body.error || "Une erreur est survenue.");
        setLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const signInRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        setError("Compte créé mais la connexion automatique a échoué. Connecte-toi manuellement.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erreur réseau. Réessaie.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* Name */}
      <div className="relative">
        <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={50}
          autoComplete="name"
          placeholder="Ton pseudo de daron"
          className={`${inputBase} ${inputNormal}`}
        />
      </div>

      {/* Email */}
      <div className="relative">
        <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="ton@email.fr"
          className={`${inputBase} ${inputNormal}`}
        />
      </div>

      {/* Password */}
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Mot de passe (8 caractères min.)"
          className={`${inputBase} ${inputNormal} pr-11`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {/* Confirm Password */}
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          name="confirm"
          type={showConfirm ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Confirme le mot de passe"
          className={`${inputBase} ${inputNormal} pr-11`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowConfirm((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
        >
          {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-[slide-down_0.3s_ease-out]">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="mt-1 h-12 w-full rounded-xl bg-[var(--color-pitch)] text-white font-semibold transition-all duration-200 hover:bg-[var(--color-pitch-bright)] hover:shadow-lg hover:shadow-[var(--color-pitch)]/25 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Création du compte...
          </span>
        ) : (
          "Creer mon compte"
        )}
      </Button>
    </form>
  );
}
