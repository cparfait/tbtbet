"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  Home,
  CalendarDays,
  ListChecks,
  Trophy,
  MessageCircle,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Hub", icon: Home },
  { href: "/matches", label: "Matchs", icon: CalendarDays },
  { href: "/results", label: "Résultats", icon: ListChecks },
  { href: "/leaderboard", label: "Classement", icon: Trophy },
  { href: "/chat", label: "Tchat", icon: MessageCircle },
  { href: "/profile", label: "Profil", icon: User },
] as const;

const LAST_SEEN_KEY = "daronsfc-chat-lastseen";

/** Détecte les nouveaux messages du tchat (pastille de notification). */
function useChatUnread(pathname: string): boolean {
  const [unread, setUnread] = useState(false);
  const onChat = pathname.startsWith("/chat");

  const check = useCallback(async () => {
    let since = localStorage.getItem(LAST_SEEN_KEY);
    if (!since) {
      since = new Date().toISOString();
      localStorage.setItem(LAST_SEEN_KEY, since);
    }
    try {
      const res = await fetch(`/api/messages?since=${encodeURIComponent(since)}`);
      if (!res.ok) return;
      const msgs: { timestamp: string }[] = await res.json();
      if (msgs.length > 0) setUnread(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (onChat) {
      // Sur le tchat : tout est lu, on met à jour le repère.
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      setUnread(false);
      return;
    }
    check();
    const t = setInterval(check, 20_000);
    return () => clearInterval(t);
  }, [onChat, check]);

  return unread && !onChat;
}

export function BottomNav() {
  const pathname = usePathname();
  const chatUnread = useChatUnread(pathname);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="absolute inset-0 glass-strong" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-border-medium)] to-transparent" />
      <ul className="relative mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5 pb-2">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "group relative flex flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium transition-all duration-200",
                  active
                    ? "text-[var(--color-pitch-bright)]"
                    : "text-[var(--color-muted)] hover:text-[var(--color-cream)]"
                )}
              >
                {active && (
                  <span className="absolute -top-1.5 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-[var(--color-pitch-bright)] transition-all duration-300" />
                )}
                <span
                  className={cn(
                    "relative flex size-9 items-center justify-center rounded-xl transition-all duration-200",
                    active
                      ? "bg-[var(--color-pitch)]/15 scale-110"
                      : "group-hover:bg-[var(--color-surface-2)] group-hover:scale-105"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[18px] transition-all duration-200",
                      active && "drop-shadow-[0_0_8px_var(--color-pitch-bright)]"
                    )}
                    strokeWidth={active ? 2.5 : 1.8}
                  />
                  {href === "/chat" && chatUnread && (
                    <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red-500 ring-2 ring-[var(--color-bg)]" />
                  )}
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
