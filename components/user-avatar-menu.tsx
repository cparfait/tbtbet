"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { User, LogOut, Settings } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";

interface UserAvatarMenuProps {
  user: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
    image: string | null;
    role: string;
    wizzBalance: number;
  };
}


export function UserAvatarMenu({ user }: UserAvatarMenuProps) {
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
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu utilisateur"
        className="relative flex items-center"
      >
        <UserAvatar src={avatarSrc} name={user.name} className="size-[42px]" />
        {user.role === "ADMIN" && (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-[var(--color-accent)] ring-1 ring-[var(--color-bg)]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-52 rounded-2xl glass-strong shadow-xl shadow-black/40 overflow-hidden border border-[var(--color-border-subtle)] z-50">
          {/* Info utilisateur */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <UserAvatar src={avatarSrc} name={user.name} className="size-9" />
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
  );
}