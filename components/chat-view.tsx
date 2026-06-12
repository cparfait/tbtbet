"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, SmilePlus, Pin, PinOff, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { GroupSwitcher } from "@/components/group-switcher";

const REACTION_EMOJIS = ["👍", "😂", "🔥", "😮", "⚽", "💀"];

type Reaction = { emoji: string; count: number; mine: boolean };

type ChatMsg = {
  id: string;
  userId: string;
  user: string;
  text: string;
  pinned: boolean;
  timestamp: string; // ISO
  reactions: Reaction[];
};

type Props = {
  currentUser: { id: string; name: string; isAdmin: boolean };
  initial: ChatMsg[];
  groups: { id: string; name: string }[];
  activeGroupId: string;
  groupName: string;
};

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

export function ChatView({
  currentUser,
  initial,
  groups,
  activeGroupId,
  groupName,
}: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>(initial);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string>(
    initial.length > 0
      ? (initial[initial.length - 1]?.timestamp ?? new Date(0).toISOString())
      : new Date(0).toISOString()
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/messages?since=${encodeURIComponent(lastRef.current)}`
      );
      if (!res.ok) return;
      const fresh: ChatMsg[] = await res.json();
      if (!fresh.length) return;
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const added = fresh.filter((m) => !ids.has(m.id));
        if (!added.length) return prev;
        lastRef.current = added[added.length - 1]?.timestamp ?? lastRef.current;
        return [...prev, ...added];
      });
    } catch {}
  }, []);

  useEffect(() => {
    const t = setInterval(poll, 5000);
    return () => clearInterval(t);
  }, [poll]);

  async function handleDelete(id: string) {
    // Retrait optimiste, restauration si l'API échoue.
    const prev = messages;
    setMessages((m) => m.filter((msg) => msg.id !== id));
    try {
      const res = await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) setMessages(prev);
    } catch {
      setMessages(prev);
    }
  }

  async function handlePin(id: string, pinned: boolean) {
    setMessages((m) =>
      m.map((msg) => (msg.id === id ? { ...msg, pinned } : msg))
    );
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, pinned }),
      });
    } catch {}
  }

  async function handleReact(id: string, emoji: string) {
    setPickerFor(null);
    // Toggle optimiste de la réaction.
    setMessages((msgs) =>
      msgs.map((m) => {
        if (m.id !== id) return m;
        const existing = m.reactions.find((r) => r.emoji === emoji);
        let reactions: Reaction[];
        if (existing?.mine) {
          reactions = m.reactions
            .map((r) =>
              r.emoji === emoji ? { ...r, count: r.count - 1, mine: false } : r
            )
            .filter((r) => r.count > 0);
        } else if (existing) {
          reactions = m.reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, mine: true } : r
          );
        } else {
          reactions = [...m.reactions, { emoji, count: 1, mine: true }];
        }
        return { ...m, reactions };
      })
    );
    try {
      await fetch("/api/messages/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: id, emoji }),
      });
    } catch {}
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg: ChatMsg = await res.json();
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m.id));
          if (ids.has(msg.id)) return prev;
          lastRef.current = msg.timestamp;
          return [...prev, msg];
        });
        setInput("");
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-7rem)] flex-col">
      <PageHeader
        title="Tchat"
        subtitle={groupName}
        action={<GroupSwitcher groups={groups} activeId={activeGroupId} />}
      />

      {/* Message list */}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-center text-sm text-[var(--color-muted)]">
              Aucun message pour l&apos;instant.
              <br />
              Sois le premier à tacler ! ⚽
            </p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isOwn = msg.userId === currentUser.id;
          const canDelete = isOwn || currentUser.isAdmin;

          const actions = (
            <div className="flex shrink-0 flex-col items-center gap-1 self-center opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setPickerFor(pickerFor === msg.id ? null : msg.id)}
                title="Réagir"
                className="flex size-7 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-cream)]"
              >
                <SmilePlus className="size-3.5" />
              </button>
              {currentUser.isAdmin && (
                <button
                  type="button"
                  onClick={() => handlePin(msg.id, !msg.pinned)}
                  title={msg.pinned ? "Désépingler" : "Épingler"}
                  className="flex size-7 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-[var(--color-gold)]"
                >
                  {msg.pinned ? (
                    <PinOff className="size-3.5" />
                  ) : (
                    <Pin className="size-3.5" />
                  )}
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(msg.id)}
                  title="Supprimer"
                  className="flex size-7 items-center justify-center rounded-lg text-[var(--color-muted)] hover:text-red-400"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          );

          return (
            <div
              key={msg.id}
              className={`group flex items-start gap-1.5 ${isOwn ? "justify-end" : "justify-start"}`}
            >
              {isOwn && actions}

              <Card
                className={`relative max-w-[85%] overflow-visible p-3 transition-all duration-200 ${
                  msg.pinned
                    ? "border-[var(--color-gold)]/40 bg-[var(--color-gold)]/5"
                    : isOwn
                      ? "border-[var(--color-pitch)]/20 bg-[var(--color-pitch)]/8"
                      : i % 2 === 0
                        ? "bg-[var(--color-surface)]"
                        : "bg-[var(--color-surface-2)]"
                }`}
              >
                {msg.pinned && (
                  <div className="mb-2 flex items-center gap-1.5">
                    <Pin className="size-3 text-[var(--color-gold)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-gold)]">
                      Épinglé
                    </span>
                  </div>
                )}

                <div className="mb-1 flex items-baseline gap-2">
                  <span className="text-xs font-bold text-[var(--color-pitch-bright)]">
                    {isOwn ? "Moi" : msg.user}
                  </span>
                  <span className="text-[10px] text-[var(--color-muted)]">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>

                <p className="text-sm leading-relaxed">{msg.text}</p>

                {/* Réactions */}
                {msg.reactions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {msg.reactions.map((r) => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => handleReact(msg.id, r.emoji)}
                        className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
                          r.mine
                            ? "bg-[var(--color-pitch)]/20 text-[var(--color-pitch-bright)]"
                            : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
                        }`}
                      >
                        <span>{r.emoji}</span>
                        <span className="font-[family-name:var(--font-mono)]">
                          {r.count}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Sélecteur d'emoji */}
                {pickerFor === msg.id && (
                  <div className="mt-2 flex flex-wrap gap-1 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-1.5">
                    {REACTION_EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => handleReact(msg.id, e)}
                        className="flex size-7 items-center justify-center rounded-lg text-base transition-transform hover:scale-125"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              {!isOwn && actions}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass mt-3 flex items-center gap-2 rounded-2xl border border-[var(--color-border-subtle)] px-3 py-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Écris ton message..."
          className="h-9 flex-1 bg-transparent text-sm text-[var(--color-cream)] placeholder:text-[var(--color-muted)] focus:outline-none"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pitch)] text-white transition-all duration-200 hover:bg-[var(--color-pitch-bright)] disabled:opacity-30 disabled:hover:bg-[var(--color-pitch)]"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}
