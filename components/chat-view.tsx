"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, SmilePlus, Pin, PinOff, Trash2 } from "lucide-react";

const REACTION_EMOJIS = ["👍", "😂", "🔥", "😮", "⚽", "💀", "💛", "🤓", "😑", "😏", "😢"];

type Reaction = { emoji: string; count: number; mine: boolean };

type ChatMsg = {
  id: string;
  userId: string;
  user: string;
  text: string;
  pinned: boolean;
  isSystem?: boolean;
  systemKind?: string | null;
  timestamp: string;
  reactions: Reaction[];
};

type Props = {
  currentUserId: string;
  isAdmin?: boolean;
};

export function ChatView({ currentUserId, isAdmin = false }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pickerMsgId, setPickerMsgId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Charger les messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages");
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, 5_000);
    return () => clearInterval(t);
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

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
        setInput("");
        inputRef.current?.focus();
        await fetchMessages();
      }
    } catch {} finally {
      setSending(false);
    }
  }

  async function handleReaction(msgId: string, emoji: string) {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, emoji }),
      });
      setPickerMsgId(null);
      await fetchMessages();
    } catch {}
  }

  async function handleTogglePin(msgId: string, pinned: boolean) {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, pinned: !pinned }),
      });
      await fetchMessages();
    } catch {}
  }

  async function handleDelete(msgId: string) {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msgId }),
      });
      await fetchMessages();
    } catch {}
  }

  const pinnedMsgs = messages.filter((m) => m.pinned);
  const regularMsgs = messages.filter((m) => !m.pinned);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 180px)" }}>
      {/* Pinned messages */}
      {pinnedMsgs.length > 0 && (
        <div className="mb-2 space-y-1">
          {pinnedMsgs.map((msg) => (
            <div
              key={msg.id}
              className="rounded-lg bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs"
            >
              <span className="font-semibold text-[var(--color-accent)]">📌 {msg.user}</span>
              <span className="ml-2 text-[var(--color-muted)]">{msg.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-2">
        {loading ? (
          <p className="text-center text-sm text-[var(--color-muted)]">Chargement...</p>
        ) : regularMsgs.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-muted)]">
            Aucun message. Lance la discussion !
          </p>
        ) : (
          regularMsgs.map((msg) => {
            const isMine = msg.userId === currentUserId;

            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center py-2">
                  <span className="inline-block rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-[10px] text-[var(--color-muted)]">
                    {msg.systemKind === "RECAP" ? "📊 " : ""}{msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`group flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[80%] ${isMine ? "order-1" : ""}`}>
                  {!isMine && (
                    <p className="mb-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
                      {msg.user}
                    </p>
                  )}
                  <div
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-[var(--color-accent)]/15 text-[var(--color-cream)]"
                        : "bg-[var(--color-surface-2)] text-[var(--color-cream)]"
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className="mt-0.5 text-right text-[9px] opacity-50">
                      {new Date(msg.timestamp).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  {/* Reactions */}
                  {msg.reactions.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {msg.reactions.map((r) => (
                        <button
                          key={r.emoji}
                          onClick={() => handleReaction(msg.id, r.emoji)}
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            r.mine
                              ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                              : "bg-[var(--color-surface-2)] text-[var(--color-muted)]"
                          }`}
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Actions (hover) */}
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={() => setPickerMsgId(pickerMsgId === msg.id ? null : msg.id)}
                      className="rounded p-0.5 text-[var(--color-muted)] hover:text-[var(--color-cream)]"
                    >
                      <SmilePlus className="size-3.5" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleTogglePin(msg.id, msg.pinned)}
                        className="rounded p-0.5 text-[var(--color-muted)] hover:text-[var(--color-cream)]"
                      >
                        {msg.pinned ? (
                          <PinOff className="size-3.5" />
                        ) : (
                          <Pin className="size-3.5" />
                        )}
                      </button>
                    )}
                    {(isAdmin || msg.userId === currentUserId) && (
                      <button
                        onClick={() => handleDelete(msg.id)}
                        className="rounded p-0.5 text-[var(--color-muted)] hover:text-red-400"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Emoji picker */}
                  {pickerMsgId === msg.id && (
                    <div className="mt-1 flex gap-1 rounded-lg bg-[var(--color-surface-2)] p-1">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReaction(msg.id, emoji)}
                          className="rounded p-1 text-sm hover:bg-[var(--color-surface-1)]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 pt-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Écris un message..."
          className="flex-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
          maxLength={500}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex size-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-black disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}