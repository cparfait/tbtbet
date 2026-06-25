"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Trophy, User, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const BASE_ITEMS = [
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { href: "/dashboard", label: "Accueil", icon: Home },
  { href: "/profile", label: "Profil", icon: User },
] as const;

const ADMIN_ITEM = { href: "/admin", label: "Admin", icon: ShieldCheck } as const;

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 glass-strong" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border-medium)] to-transparent" />
      <ul className="relative mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5 pb-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "group relative flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-all duration-200",
                  active
                    ? "text-[var(--color-accent-bright)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-cream)]"
                )}
              >
                {active && (
                  <span className="absolute -top-1.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[var(--color-accent-bright)] transition-all duration-300" />
                )}
                <span
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-xl transition-all duration-200",
                    active
                      ? "bg-[var(--color-accent)]/15 scale-110"
                      : "group-hover:bg-[var(--color-surface-2)] group-hover:scale-105"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[18px] transition-all duration-200",
                      active && "drop-shadow-[0_0_8px_var(--color-accent-bright)]"
                    )}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                </span>
                <span
                  className={cn(
                    "transition-all duration-200",
                    active && "font-semibold"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
