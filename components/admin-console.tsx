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
  Users,
  Copy,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  AdminUser,
  AdminMatchBrief,
  AdminMatchResult,
  AdminGroup,
  AdminPredictionMap,
} from "@/lib/data/admin";

export function AdminConsole({
  users,
  matches,
  allMatches,
  groups,
  predictions,
  currentUserId,
  championTeams,
  championOverride,
}: {
  users: AdminUser[];
  matches: AdminMatchResult[];
  allMatches: AdminMatchBrief[];
  groups: AdminGroup[];
  predictions: AdminPredictionMap;
  currentUserId: string;
  championTeams: { team: string; flag: string }[];
  championOverride: { team: string; flag: string } | null;
}) {
  return (
    <div className="grid gap-4">
      <SyncPanel />
      <InvitePanel />
      <GroupsPanel groups={groups} />
      <ImportPredictionPanel users={users} matches={allMatches} predictions={predictions} />
      <ManualScorePanel matches={matches} />
      <OddsPanel matches={matches} />
      <RescorePanel />
      <ChampionPanel teams={championTeams} current={championOverride} />
      <UsersPanel users={users} currentUserId={currentUserId} />
      <CloseTournamentPanel />
      <ResetPanel />
    </div>
  );
}

/* ─── Désignation manuelle du champion (finale aux tirs au but) ─── */
function ChampionPanel({
  teams,
  current,
}: {
  teams: { team: string; flag: string }[];
  current: { team: string; flag: string } | null;
}) {
  const router = useRouter();
  const [team, setTeam] = useState(current?.team ?? teams[0]?.team ?? "");
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();

  const setChampion = () =>
    start(async () => {
      try {
        const res = await fetch("/api/admin/champion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          flash("Champion désigné, bonus crédité ✅", true);
          router.refresh();
        } else {
          flash(data.error ?? "Échec.", false);
        }
      } catch {
        flash("Réseau indisponible.", false);
      }
    });

  const clearChampion = () =>
    start(async () => {
      try {
        const res = await fetch("/api/admin/champion", { method: "DELETE" });
        if (res.ok) {
          flash("Désignation annulée.", true);
          router.refresh();
        } else {
          flash("Échec.", false);
        }
      } catch {
        flash("Réseau indisponible.", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">🏆 Vainqueur du tournoi</CardTitle>
        <p className="mt-1 mb-3 text-xs text-[var(--color-muted)]">
          À n&apos;utiliser que si la <strong>finale se joue aux tirs au but</strong> :
          le vainqueur ne peut pas être déduit du score. Désigne-le ici pour
          créditer les <strong>+50 pts</strong> aux bons parieurs (sinon il est
          déterminé automatiquement par le score de la finale).
        </p>

        {current && (
          <p className="mb-3 text-sm text-[var(--color-cream)]">
            Champion désigné : <strong>{current.team}</strong>
          </p>
        )}

        <div className="flex gap-2">
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-pitch)]"
          >
            {teams.map((t) => (
              <option key={t.team} value={t.team}>
                {t.team}
              </option>
            ))}
          </select>
          <Button onClick={setChampion} disabled={pending || !team}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : "Désigner"}
          </Button>
        </div>

        {current && (
          <button
            type="button"
            onClick={clearChampion}
            disabled={pending}
            className="mt-2 text-xs text-[var(--color-muted)] underline hover:text-[var(--color-cream)]"
          >
            Annuler la désignation manuelle
          </button>
        )}

        {msg && (
          <p className={`mt-2 text-xs ${msg.ok ? "text-[var(--color-pitch-bright)]" : "text-red-400"}`}>
            {msg.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Consultation des groupes (membres + chat lecture seule) ─── */
function GroupsPanel({ groups }: { groups: AdminGroup[] }) {
  const { msg, flash } = useFeedback();
  const [openId, setOpenId] = useState<string | null>(null);

  const copyLink = async (name: string, token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // fallback
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      flash(`✓ Lien de « ${name} » copié`, true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        flash(`✓ Lien de « ${name} » copié`, true);
      } catch {
        flash("Copie ce lien : " + url, true);
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="size-4 text-[var(--color-pitch-bright)]" />
          Groupes ({groups.length})
        </CardTitle>
        {groups.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted)]">Aucun groupe.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {groups.map((g) => {
              const open = openId === g.id;
              return (
                <div
                  key={g.id}
                  className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]"
                >
                  {/* En-tête cliquable */}
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : g.id)}
                    className="flex w-full items-center gap-2 p-2.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {g.memberCount} membre{g.memberCount > 1 ? "s" : ""}
                        {g.createdByName ? ` · ${g.createdByName}` : ""}
                        {g.recentMessages.length > 0 && (
                          <>
                            {" · "}
                            <MessageSquare className="mb-0.5 inline size-3" />
                            {g.recentMessages.length}
                          </>
                        )}
                      </p>
                    </div>
                    <ChevronDown
                      className={`size-4 shrink-0 text-[var(--color-muted)] transition-transform ${open ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Détail dépliable */}
                  {open && (
                    <div className="border-t border-[var(--color-border-subtle)] px-2.5 pb-2.5 pt-2">
                      {/* Membres */}
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                        Membres
                      </p>
                      <div className="mb-3 flex flex-col gap-1">
                        {g.members.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 rounded-lg bg-[var(--color-surface)] px-2 py-1"
                          >
                            <span className="truncate text-xs font-medium">
                              {m.name}
                            </span>
                            {m.role === "OWNER" && (
                              <span className="rounded bg-[var(--color-gold)]/15 px-1 py-0.5 text-[8px] font-bold uppercase text-[var(--color-gold)]">
                                Owner
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Derniers messages */}
                      {g.recentMessages.length > 0 ? (
                        <>
                          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                            Derniers messages
                          </p>
                          <div className="flex flex-col gap-1">
                            {g.recentMessages.map((m) => (
                              <div
                                key={m.id}
                                className="rounded-lg bg-[var(--color-surface)] px-2 py-1.5"
                              >
                                <span className="text-xs font-semibold text-[var(--color-pitch-bright)]">
                                  {m.userName}
                                </span>
                                <span className="ml-1.5 text-xs text-[var(--color-cream)]">
                                  {m.content}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-[var(--color-muted)]">
                          Aucun message.
                        </p>
                      )}

                      {/* Lien d'invitation */}
                      <button
                        type="button"
                        onClick={() => copyLink(g.name, g.token)}
                        className="mt-3 flex items-center gap-1.5 rounded-lg border border-[var(--color-border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-muted)] transition-colors hover:text-[var(--color-cream)]"
                      >
                        <Copy className="size-3" />
                        Copier le lien
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
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

/* ─── Saisie / correction manuelle d'un score ─── */
function ManualScorePanel({ matches }: { matches: AdminMatchResult[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const selected = matches.find((m) => m.id === matchId);
  // Pré-remplit avec le score déjà enregistré (cas correction d'un match fini).
  const [home, setHome] = useState(
    selected?.homeScore != null ? String(selected.homeScore) : ""
  );
  const [away, setAway] = useState(
    selected?.awayScore != null ? String(selected.awayScore) : ""
  );

  const onSelect = (id: string) => {
    setMatchId(id);
    const m = matches.find((x) => x.id === id);
    setHome(m?.homeScore != null ? String(m.homeScore) : "");
    setAway(m?.awayScore != null ? String(m.awayScore) : "");
  };

  const submit = () =>
    start(async () => {
      if (!matchId || home === "" || away === "") {
        flash("Sélectionne un match et saisis les deux scores.", false);
        return;
      }
      if (
        selected?.finished &&
        !confirm(
          "Ce match est déjà terminé. Corriger le score RECALCULE les points de tous les joueurs concernés. Continuer ?"
        )
      )
        return;
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
        flash(
          selected?.finished
            ? `✓ Score corrigé (${data.scored} pronos recalculés)`
            : `✓ Résultat enregistré (${data.scored} pronos crédités)`,
          true
        );
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
          Saisis un résultat si l&apos;API est en retard, ou corrige un match
          déjà terminé (les points sont recalculés).
        </p>

        {matches.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Aucun match commencé pour l&apos;instant.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              value={matchId}
              onChange={(e) => onSelect(e.target.value)}
              className="h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-cream)]"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam} – {m.awayTeam}
                  {m.finished ? "  ✓ terminé" : ""}
                </option>
              ))}
            </select>

            {selected?.finished && (
              <p className="rounded-lg bg-[var(--color-gold)]/10 px-3 py-2 text-xs text-[var(--color-gold)]">
                ⚠️ Match terminé — enregistrer recalcule les points de tous les
                joueurs.
              </p>
            )}

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
              {selected?.finished ? "Corriger le résultat" : "Enregistrer le résultat"}
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

/* ─── Saisie/backfill manuel des cotes 1X2 d'un match ─── */
function OddsPanel({ matches }: { matches: AdminMatchResult[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const selected = matches.find((m) => m.id === matchId);
  const [h, setH] = useState(selected?.oddsHome != null ? String(selected.oddsHome) : "");
  const [d, setD] = useState(selected?.oddsDraw != null ? String(selected.oddsDraw) : "");
  const [a, setA] = useState(selected?.oddsAway != null ? String(selected.oddsAway) : "");

  const onSelect = (id: string) => {
    setMatchId(id);
    const m = matches.find((x) => x.id === id);
    setH(m?.oddsHome != null ? String(m.oddsHome) : "");
    setD(m?.oddsDraw != null ? String(m.oddsDraw) : "");
    setA(m?.oddsAway != null ? String(m.oddsAway) : "");
  };

  const submit = () =>
    start(async () => {
      const oddsHome = Number(h);
      const oddsDraw = Number(d);
      const oddsAway = Number(a);
      if (!matchId || ![oddsHome, oddsDraw, oddsAway].every((x) => x > 1)) {
        flash("Saisis les 3 cotes décimales (> 1, ex. 1.85).", false);
        return;
      }
      try {
        const res = await fetch("/api/admin/odds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ matchId, oddsHome, oddsDraw, oddsAway }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        flash(
          data.finished
            ? `✓ Cotes enregistrées (${data.scored} pronos recalculés)`
            : "✓ Cotes enregistrées",
          true
        );
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  const oddInput = (
    label: string,
    value: string,
    onChange: (v: string) => void
  ) => (
    <label className="flex flex-col gap-1 text-center">
      <span className="truncate text-xs text-[var(--color-muted)]">{label}</span>
      <input
        type="number"
        step="0.01"
        min="1.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1.85"
        className="h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-center text-sm font-bold text-[var(--color-cream)]"
      />
    </label>
  );

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">🎲 Cotes manuelles</CardTitle>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Saisis les cotes 1X2 d&apos;un match (backfill des matchs joués avant la
          capture auto). Si le match est terminé, les points sont recalculés.
        </p>

        {matches.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Aucun match commencé pour l&apos;instant.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <select
              value={matchId}
              onChange={(e) => onSelect(e.target.value)}
              className="h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-cream)]"
            >
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam} – {m.awayTeam}
                  {m.oddsHome != null ? "  ✓ cotée" : ""}
                  {m.finished ? "  · terminé" : ""}
                </option>
              ))}
            </select>

            <div className="grid grid-cols-3 gap-2">
              {oddInput(selected?.homeTeam ?? "Domicile", h, setH)}
              {oddInput("Nul", d, setD)}
              {oddInput(selected?.awayTeam ?? "Extérieur", a, setA)}
            </div>

            <Button variant="gold" size="sm" onClick={submit} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : <Check />}
              Enregistrer les cotes
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

/* ─── Recalcul global des points (changement de barème) ─── */
function RescorePanel() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();

  const rescore = () =>
    start(async () => {
      if (
        !confirm(
          "Recalculer TOUS les points à partir des résultats enregistrés ?\n\nUtile après un changement de barème. Sans danger : l'opération est idempotente."
        )
      )
        return;
      try {
        const res = await fetch("/api/admin/rescore", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Erreur");
        flash(
          `✓ ${data.matches} matchs ré-appliqués, ${data.predictions} pronos recalculés.`,
          true
        );
        router.refresh();
      } catch (e) {
        flash(e instanceof Error ? e.message : "Erreur", false);
      }
    });

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-base">♻️ Recalculer les points</CardTitle>
        <p className="mt-1 mb-3 text-sm text-[var(--color-muted)]">
          Ré-applique le barème actuel à tous les matchs terminés (à lancer
          après une mise à jour des règles de calcul).
        </p>
        <Button variant="primary" size="sm" onClick={rescore} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Tout recalculer
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

/* ─── Import d'un prono pour un joueur ─── */
function ImportPredictionPanel({
  users,
  matches,
  predictions,
}: {
  users: AdminUser[];
  matches: AdminMatchBrief[];
  predictions: AdminPredictionMap;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { msg, flash } = useFeedback();
  const [userId, setUserId] = useState(users[0]?.id ?? "");
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [joker, setJoker] = useState(false);

  const existing = userId && matchId ? predictions[`${userId}|${matchId}`] : undefined;

  const onSelectMatch = (id: string) => {
    setMatchId(id);
    setHome("");
    setAway("");
    setJoker(false);
  };

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

  const hasCount = userId
    ? matches.filter((m) => predictions[`${userId}|${m.id}`]).length
    : 0;

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
            {/* Joueur */}
            <select
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value);
                setHome("");
                setAway("");
                setJoker(false);
              }}
              className="h-11 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 text-sm text-[var(--color-cream)]"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>

            {/* Compteur de pronos */}
            <p className="text-xs text-[var(--color-muted)]">
              {hasCount}/{matches.length} pronos effectués
            </p>

            {/* Liste des matchs avec statut */}
            <div className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded-xl border border-[var(--color-border-subtle)] p-1.5">
              {matches.map((m) => {
                const pred = userId ? predictions[`${userId}|${m.id}`] : undefined;
                const selected = m.id === matchId;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onSelectMatch(m.id)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      selected
                        ? "bg-[var(--color-pitch)]/15"
                        : "hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    <span className="shrink-0">
                      {pred ? (
                        <Check className="size-4 text-[var(--color-pitch-bright)]" />
                      ) : (
                        <span className="block size-4 rounded-full border-2 border-[var(--color-border-subtle)]" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-xs ${selected ? "font-bold" : "font-medium"}`}>
                        {m.homeTeam} – {m.awayTeam}
                      </p>
                      <p className="text-[10px] text-[var(--color-muted)]">
                        {pred
                          ? `${pred.homeScore}-${pred.awayScore}${pred.joker ? " 🃏" : ""}`
                          : m.finished
                            ? "terminé"
                            : "à venir"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Saisie du score */}
            <div className="flex items-center justify-center gap-3">
              <input
                type="number"
                min={0}
                max={20}
                value={home}
                onChange={(e) => setHome(e.target.value)}
                placeholder={existing ? String(existing.homeScore) : "0"}
                className="h-14 w-16 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] text-center text-2xl font-bold text-[var(--color-cream)]"
              />
              <span className="text-xl font-bold text-[var(--color-muted)]">–</span>
              <input
                type="number"
                min={0}
                max={20}
                value={away}
                onChange={(e) => setAway(e.target.value)}
                placeholder={existing ? String(existing.awayScore) : "0"}
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
