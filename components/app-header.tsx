"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, LogOut, Settings } from "lucide-react";

interface AppHeaderProps {
  user: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
    image: string | null;
    role: string;
    wizzBalance: number;
  };
}

function Avatar({ name, src, size = 32 }: { name: string | null; src: string | null; size?: number }) {
  const initials = (name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "avatar"}
        width={size}
        height={size}
        className="rounded-full object-cover ring-2 ring-[var(--color-accent)]/30"
        style={{ width: size, height: size }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }

  return (
    <span
      className="flex items-center justify-center rounded-full bg-[var(--color-accent)]/20 font-bold text-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/30"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const avatarSrc = user.avatarUrl ?? user.image ?? null;

  return (
    <header className="sticky top-0 z-40 mx-auto flex w-full max-w-md items-center justify-between px-4 py-3">
      {/* Fond flou */}
      <div className="absolute inset-0 glass-strong border-b border-[var(--color-border-subtle)]" />

      {/* Logo / nom app */}
      <Link href="/dashboard" className="relative z-10 flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="TBT Bet" className="size-7 rounded-lg" />
        <span className="font-[family-name:var(--font-display)] text-base font-bold tracking-tight text-[var(--color-cream)]">
          TBT <span className="text-[var(--color-accent)]">Bet</span>
        </span>
      </Link>

      {/* Solde Wizz + Avatar */}
      <div className="relative z-10 flex items-center gap-3" ref={ref}>
        <span className="text-xs font-semibold text-[var(--color-accent)]">
          {user.wizzBalance} Wizz
        </span>

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu utilisateur"
          className="relative flex items-center"
        >
          <Avatar name={user.name} src={avatarSrc} size={34} />
          {user.role === "ADMIN" && (
            <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[var(--color-accent)] ring-1 ring-[var(--color-bg)]" />
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-52 rounded-2xl glass-strong shadow-xl shadow-black/40 overflow-hidden border border-[var(--color-border-subtle)]">
            {/* Info utilisateur */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--color-border-subtle)]">
              <Avatar name={user.name} src={avatarSrc} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate text-[var(--color-cream)]">
                  {user.name || "Anonyme"}
                </p>
                <p className="text-[10px] text-[var(--color-muted)] truncate">{user.email}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-1.5 space-y-0.5">
              <Link
                href="/profile"
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--color-cream)] hover:bg-white/5 transition-colors"
                onClick={() => setOpen(false)}
              >
                <User className="size-4 text-[var(--color-muted)]" />
                Mon profil
              </Link>

              {user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--color-accent)] hover:bg-[var(--color-accent)]/5 transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <Settings className="size-4" />
                  Console admin
                </Link>
              )}

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-red-400 hover:bg-red-400/5 transition-colors"
              >
                <LogOut className="size-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
