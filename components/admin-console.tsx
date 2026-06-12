"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Ban,
  ShieldCheck,
  ShieldOff,
  Undo2,
  Check,
  Loader2,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AdminUser, AdminMatchBrief } from "@/lib/data/admin";

type UnfinishedMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
};

export function AdminConsole({
  users,
  matches,
  allMatches,
  currentUserId,
}: {
  users: AdminUser[];
  matches: UnfinishedMatch[];
  allMatches: AdminMatchBrief[];
  currentUserId: string;
}) {
  return (
    <div className="grid gap-4">
      <SyncPanel />
      <InvitePanel />
      <ImportPredictionPanel users={users} matches={allMatches} />
      <ManualScorePanel matches={matches} />
      <UsersPanel users={users} currentUserId={currentUserId} />
      <CloseTournamentPanel />
      <ResetPanel />
    </div>
  );
}

/* ─── Remise à zéro (zone dangereuse) ─── */
function ResetPanel() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();

  const reset = () =>
    start(async () => {
      if (
        !confirm(
          "⚠️ REMISE À ZÉRO\n\nEfface TOUS les pronos, résultats, scores, messages et badges.\nLes comptes, les matchs et les groupes sont conservés.\n\nContinuer ?"
        )
      )
        return;
      if (!confirm("Dernière confirmation : cette action est IRRÉVERSIBLE. Tout effacer ?"))
        return;
      try {
        const res = await fetch("/api/admin/reset", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        flash(
          `✓ Remis à zéro : ${data.predictions} pronos, ${data.results} résultats, ${data.messages} messages effacés.`,
          true
        );
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card className="border-red-500/30 bg-red-500/[0.04]">
      <CardContent className="p-4">
        <CardTitle className="text-base text-red-400">🧨 Remise à zéro</CardTitle>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Repart à 0 une fois les tests finis : efface pronos, résultats, scores,
          messages et badges. <strong className="text-[var(--color-cream)]">Conserve</strong> les
          comptes, les matchs et les groupes.
        </p>
        <Button variant="danger" size="sm" onClick={reset} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          Tout remettre à zéro
        </Button>
        {msg && (
          <p
            className={`mt-2 text-sm ${msg.ok ? "text-[var(--color-pitch-bright)]" : "text-red-400"}`}
          >
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Génération d'un lien d'invitation ─── */
function InvitePanel() {
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();
  const [link, setLink] = useState("");

  const generate = () =>
    start(async () => {
      try {
        const res = await fetch("/api/admin/invite", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        const url = `${window.location.origin}/invite/${data.token}`;
        setLink(url);
        try {
          await navigator.clipboard.writeText(url);
          flash("✓ Lien copié dans le presse-papier", true);
        } catch {
          flash("Lien généré (copie manuelle)", true);
        }
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">✉️ Inviter des joueurs</CardTitle>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Génère un lien à partager (20 usages, valable 30 jours).
        </p>
        <Button variant="primary" size="sm" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
          Générer un lien
        </Button>
        {link && (
          <p className="mt-2 break-all rounded-lg bg-[var(--color-surface-2)] p-2 font-[family-name:var(--font-mono)] text-xs text-[var(--color-pitch-bright)]">
            {link}
          </p>
        )}
        {msg && (
          <p
            className={`mt-2 text-sm ${msg.ok ? "text-[var(--color-pitch-bright)]" : "text-red-400"}`}
          >
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Clôture du tournoi (badge daronissime) ─── */
function CloseTournamentPanel() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();

  const close = () =>
    start(async () => {
      if (!confirm("Décerner le titre de Daronissime 👑 au leader du classement ?"))
        return;
      try {
        const res = await fetch("/api/admin/close-tournament", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        flash(`👑 Daronissime décerné à ${data.champion} !`, true);
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">👑 Clôturer le tournoi</CardTitle>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Décerne le badge Daronissime au 1ᵉʳ du classement. À faire en fin de
          Coupe du Monde.
        </p>
        <Button variant="gold" size="sm" onClick={close} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />}
          Sacrer le Daronissime
        </Button>
        {msg && (
          <p
            className={`mt-2 text-sm ${msg.ok ? "text-[var(--color-pitch-bright)]" : "text-red-400"}`}
          >
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Feedback inline ─── */
function useFeedback() {
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const flash = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };
  return { msg, flash };
}

/* ─── Synchronisation manuelle ─── */
function SyncPanel() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();

  const sync = () =>
    start(async () => {
      try {
        const res = await fetch("/api/sync", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        flash(`✓ ${data.matches} matchs, ${data.results} résultats`, true);
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">⚽ Synchronisation</CardTitle>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Force une mise à jour immédiate des matchs et scores depuis l&apos;API.
        </p>
        <Button variant="primary" size="sm" onClick={sync} disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
          Synchroniser maintenant
        </Button>
        {msg && (
          <p
            className={`mt-2 text-sm ${msg.ok ? "text-[var(--color-pitch-bright)]" : "text-red-400"}`}
          >
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Saisie manuelle d'un score ─── */
function ManualScorePanel({ matches }: { matches: UnfinishedMatch[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");

  const submit = () =>
    start(async () => {
      if (!matchId || home === "" || away === "") {
        flash("Sélectionne un match et saisis les deux scores.", false);
        return;
      }
      try {
        const res = await fetch("/api/admin/result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matchId,
            homeScore: Number(home),
            awayScore: Number(away),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        flash(`✓ Résultat enregistré (${data.scored} pronos crédités)`, true);
        setHome("");
        setAway("");
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">📝 Score manuel</CardTitle>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Saisis un résultat si l&apos;API est en retard.
        </p>

        {matches.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Aucun match en attente de résultat.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              className="h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-cream)]"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam} – {m.awayTeam}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-center gap-3">
              <input
                type="number"
                min={0}
                max={99}
                value={home}
                onChange={(e) => setHome(e.target.value)}
                placeholder="0"
                className="h-14 w-16 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-center text-2xl font-bold text-[var(--color-cream)]"
              />
              <span className="text-xl font-bold text-[var(--color-muted)]">–</span>
              <input
                type="number"
                min={0}
                max={99}
                value={away}
                onChange={(e) => setAway(e.target.value)}
                placeholder="0"
                className="h-14 w-16 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-center text-2xl font-bold text-[var(--color-cream)]"
              />
            </div>

            <Button variant="gold" size="sm" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Enregistrer le résultat
            </Button>
          </div>
        )}

        {msg && (
          <p
            className={`mt-2 text-sm ${msg.ok ? "text-[var(--color-pitch-bright)]" : "text-red-400"}`}
          >
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Import d'un prono pour un joueur ─── */
function ImportPredictionPanel({
  users,
  matches,
}: {
  users: AdminUser[];
  matches: AdminMatchBrief[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [joker, setJoker] = useState(false);

  const submit = () =>
    start(async () => {
      if (!userId || !matchId || home === "" || away === "") {
        flash("Choisis un joueur, un match et les deux scores.", false);
        return;
      }
      try {
        const res = await fetch("/api/admin/prediction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            matchId,
            homeScore: Number(home),
            awayScore: Number(away),
            joker,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        if (data.warning) {
          flash(data.warning, false);
        } else {
          flash(
            data.scored > 0
              ? "✓ Prono importé et crédité"
              : data.alreadyScored
                ? "✓ Prono mis à jour (points déjà comptés)"
                : "✓ Prono importé",
            true
          );
        }
        setHome("");
        setAway("");
        setJoker(false);
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">📥 Import prono</CardTitle>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Reprends le prono d&apos;un joueur (autre appli). Verrou de coup
          d&apos;envoi ignoré ; crédité si le match est terminé.
        </p>

        {users.length === 0 || matches.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Aucun joueur ou aucun match disponible.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-cream)]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>

            <select
              value={matchId}
              onChange={(e) => setMatchId(e.target.value)}
              className="h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-cream)]"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam} – {m.awayTeam}
                  {m.finished ? " ✓" : ""}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-center gap-3">
              <input
                type="number"
                min={0}
                max={20}
                value={home}
                onChange={(e) => setHome(e.target.value)}
                placeholder="0"
                className="h-14 w-16 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-center text-2xl font-bold text-[var(--color-cream)]"
              />
              <span className="text-xl font-bold text-[var(--color-muted)]">–</span>
              <input
                type="number"
                min={0}
                max={20}
                value={away}
                onChange={(e) => setAway(e.target.value)}
                placeholder="0"
                className="h-14 w-16 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-center text-2xl font-bold text-[var(--color-cream)]"
              />
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 text-sm text-[var(--color-muted)]">
              <input
                type="checkbox"
                checked={joker}
                onChange={(e) => setJoker(e.target.checked)}
                className="size-4 accent-[var(--color-gold)]"
              />
              🃏 Joker (×2)
            </label>

            <Button variant="gold" size="sm" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Importer le prono
            </Button>
          </div>
        )}

        {msg && (
          <p
            className={`mt-2 text-sm ${msg.ok ? "text-[var(--color-pitch-bright)]" : "text-red-400"}`}
          >
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Gestion des utilisateurs ─── */
function UsersPanel({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();
  const [busyId, setBusyId] = useState<string | null>(null);

  const act = (userId: string, action: string) =>
    start(async () => {
      setBusyId(userId);
      try {
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, action }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      } finally {
        setBusyId(null);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">👥 Utilisateurs ({users.length})</CardTitle>
        {msg && !msg.ok && (
          <p className="mt-2 text-sm text-red-400">{msg.text}</p>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {users.map((u) => {
            const isSelf = u.id === currentUserId;
            const busy = pending && busyId === u.id;
            return (
              <div
                key={u.id}
                className="flex items-center gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{u.name}</span>
                    {u.role === "ADMIN" && (
                      <span className="rounded bg-[var(--color-gold)]/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-[var(--color-gold)]">
                        Admin
                      </span>
                    )}
                    {u.banned && (
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-400">
                        Banni
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-[var(--color-muted)]">
                    {u.points} pts · {u.predictions} pronos
                  </p>
                </div>

                {busy ? (
                  <Loader2 className="size-4 animate-spin text-[var(--color-muted)]" />
                ) : (
                  !isSelf && (
                    <div className="flex shrink-0 gap-1">
                      {/* Ban / unban */}
                      {u.banned ? (
                        <button
                          onClick={() => act(u.id, "unban")}
                          title="Débannir"
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--color-pitch-bright)] hover:bg-[var(--color-surface-3)]"
                        >
                          <Undo2 className="size-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => act(u.id, "ban")}
                          title="Bannir"
                          className="flex size-8 items-center justify-center rounded-lg text-red-400 hover:bg-[var(--color-surface-3)]"
                        >
                          <Ban className="size-4" />
                        </button>
                      )}
                      {/* Promote / demote */}
                      {u.role === "ADMIN" ? (
                        <button
                          onClick={() => act(u.id, "demote")}
                          title="Retirer admin"
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-[var(--color-surface-3)]"
                        >
                          <ShieldOff className="size-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => act(u.id, "promote")}
                          title="Passer admin"
                          className="flex size-8 items-center justify-center rounded-lg text-[var(--color-gold)] hover:bg-[var(--color-surface-3)]"
                        >
                          <ShieldCheck className="size-4" />
                        </button>
                      )}
                      {/* Supprimer */}
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Supprimer définitivement ${u.name} ? (pronos, points, messages… seront effacés)`
                            )
                          )
                            act(u.id, "delete");
                        }}
                        title="Supprimer le compte"
                        className="flex size-8 items-center justify-center rounded-lg text-red-400 hover:bg-[var(--color-surface-3)]"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
