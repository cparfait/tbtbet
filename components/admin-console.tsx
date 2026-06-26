"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, dayKey, dayLabel, formatKickoffTime } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import { Users, Swords, Trophy, Plus, Trash2, CheckCircle2, Calendar, RefreshCw, ImageIcon, Upload, Wrench, RotateCcw, Sparkles, Zap, TrendingUp, Shuffle } from "lucide-react";
import { TirageOverlay, type TiragePayload } from "@/components/tirage-overlay";

// ── Types ──

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  wizzBalance: number;
  jokersLeft: number;
  banned: boolean;
  createdAt: Date;
}

interface Team {
  id: string;
  name: string;
  player1: string | null;
  player2: string | null;
  logoUrl: string | null;
  poolId: string | null;
  pool?: { id: string; name: string } | null;
  eliminated: boolean;
  elo: number;
}

interface Pool {
  id: string;
  name: string;
  color: string;
  teams: Team[];
}

interface Match {
  id: string;
  label: string;
  phase: string;
  teamA: Team;
  teamB: Team | null;
  teamASource: string;
  teamBSource: string;
  status: string;
  result: string | null;
  scoreA: number | null;
  scoreB: number | null;
  scheduledAt: Date | string | null;
  finalSeriesId: string | null;
  eloChangeA: number | null;
  eloChangeB: number | null;
}

interface AdminConsoleProps {
  users: AdminUser[];
  teams: Team[];
  pools: Pool[];
  matches: Match[];
  currentUserId: string;
}

type Tab = "teams" | "pools" | "matches" | "results" | "users" | "tools" | "elo" | "tirage" | "tests";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "teams", label: "Équipes", icon: Swords },
  { key: "pools", label: "Poules", icon: Trophy },
  { key: "matches", label: "Matchs", icon: Calendar },
  { key: "results", label: "Résultats", icon: CheckCircle2 },
  { key: "users", label: "Joueurs", icon: Users },
  { key: "elo", label: "ELO", icon: TrendingUp },
  { key: "tirage", label: "Tirage", icon: Shuffle },
  { key: "tools", label: "Outils", icon: Wrench },
  { key: "tests", label: "Tests", icon: Zap },
];

const PHASES = [
  { value: "POOL", label: "Phase de poules" },
  { value: "WINNER_BRACKET", label: "Winner Bracket" },
  { value: "LOSER_BRACKET", label: "Loser Bracket" },
  { value: "FINAL_SERIES", label: "Finale (BO3)" },
];

const SOURCES = [
  { value: "POOL", label: "Poule" },
  { value: "WINNER_BRACKET", label: "Winner" },
  { value: "LOSER_BRACKET", label: "Loser" },
];

export function AdminConsole({ users, teams, pools, matches, currentUserId }: AdminConsoleProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("teams");
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<"create" | string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Teams form
  const [teamName, setTeamName] = useState("");
  const [teamPlayer1, setTeamPlayer1] = useState("");
  const [teamPlayer2, setTeamPlayer2] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");

  // Pool form
  const [poolName, setPoolName] = useState("");
  const [poolColor, setPoolColor] = useState("#F5C400");
  // Couleurs en cours d'édition par poule (poolId → couleur)
  const [poolColorEdits, setPoolColorEdits] = useState<Record<string, string>>({});

  // Match form
  const [matchLabel, setMatchLabel] = useState("");
  const [matchPhase, setMatchPhase] = useState("POOL");
  const [matchTeamAId, setMatchTeamAId] = useState("");
  const [matchTeamASource, setMatchTeamASource] = useState("POOL");
  const [matchTeamBId, setMatchTeamBId] = useState("");
  const [matchTeamBSource, setMatchTeamBSource] = useState("POOL");
  const [matchScheduledAt, setMatchScheduledAt] = useState("");
  // Inline date editing for pool matches
  const [editDateMatchId, setEditDateMatchId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState("");

  // Result form
  const [resultMatchId, setResultMatchId] = useState("");
  const [resultScoreA, setResultScoreA] = useState(0);
  const [resultScoreB, setResultScoreB] = useState(0);
  const [resultWinner, setResultWinner] = useState<"TEAM_A" | "TEAM_B" | "DRAW">("TEAM_A");

  // Create user form
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<"USER" | "ADMIN">("USER");

  // Delete user confirmation
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);

  // ELO inline editing (teamId → value as string)
  const [eloEdits, setEloEdits] = useState<Record<string, string>>({});

  // Tirage au sort
  const [tiragePayload, setTiragePayload] = useState<TiragePayload | null>(null);
  const [tirageEventId, setTirageEventId] = useState<string | null>(null);
  const [tirageLoading, setTirageLoading] = useState(false);
  const [nextRoundLoading, setNextRoundLoading] = useState(false);

  async function apiCall(url: string, method: string, body?: Record<string, unknown>) {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Erreur");
    }
    return res.json();
  }

  function ok(msg: string) { setMessage(msg); router.refresh(); }
  function err(e: unknown) { setMessage(e instanceof Error ? e.message : "Erreur"); }

  // ── Teams ──
  async function handleCreateTeam() {
    if (!teamName.trim()) return;
    try {
      await apiCall("/api/admin/teams", "POST", {
        name: teamName,
        player1: teamPlayer1 || null,
        player2: teamPlayer2 || null,
        logoUrl: teamLogoUrl || null,
      });
      setTeamName(""); setTeamPlayer1(""); setTeamPlayer2(""); setTeamLogoUrl("");
      ok("Équipe créée !");
    } catch (e) { err(e); }
  }

  async function handleDeleteTeam(id: string) {
    try { await apiCall(`/api/admin/teams?id=${id}`, "DELETE"); ok("Équipe supprimée."); }
    catch (e) { err(e); }
  }

  async function handleSaveLogo(teamId: string, logoUrl: string) {
    try {
      await apiCall("/api/admin/teams", "PATCH", { id: teamId, logoUrl: logoUrl || null });
      ok("Logo mis à jour.");
    } catch (e) { err(e); }
  }

  // ── Pools ──
  async function handleCreatePool() {
    if (!poolName.trim()) return;
    try { await apiCall("/api/admin/pools", "POST", { name: poolName, color: poolColor }); setPoolName(""); ok("Poule créée !"); }
    catch (e) { err(e); }
  }

  async function handleDeletePool(id: string) {
    try { await apiCall(`/api/admin/pools?id=${id}`, "DELETE"); ok("Poule supprimée."); }
    catch (e) { err(e); }
  }

  async function handleUpdatePoolColor(id: string, color: string) {
    try {
      await apiCall("/api/admin/pools", "PATCH", { id, color });
      setPoolColorEdits((prev) => { const next = { ...prev }; delete next[id]; return next; });
      ok("Couleur mise à jour.");
    }
    catch (e) { err(e); }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Erreur upload");
      const url: string = (data as { url: string }).url;
      if (uploadTarget === "create") {
        setTeamLogoUrl(url);
      } else if (uploadTarget) {
        // Upload direct depuis la liste → sauvegarder immédiatement
        await handleSaveLogo(uploadTarget, url);
      }
    } catch (e) {
      err(e);
    } finally {
      setUploading(false);
    }
  }

  function triggerUpload(target: "create" | string) {
    setUploadTarget(target);
    fileInputRef.current?.click();
  }

  async function handleAssignTeamToPool(teamId: string, poolId: string) {
    try { await apiCall("/api/admin/teams", "PATCH", { id: teamId, poolId: poolId || null }); ok("Équipe assignée."); }
    catch (e) { err(e); }
  }

  // ── Matches ──
  async function handleGeneratePoolMatches() {
    try {
      const res = await apiCall("/api/admin/generate-pool-matches", "POST");
      ok(`${res.created} match${res.created !== 1 ? "s" : ""} de poules générés.`);
    } catch (e) { err(e); }
  }


  async function handleCreateMatch() {
    if (!matchTeamAId || !matchTeamBId || matchTeamAId === matchTeamBId) {
      setMessage("Sélectionne deux équipes différentes."); return;
    }
    try {
      await apiCall("/api/admin/matches", "POST", {
        label: matchLabel || undefined,
        phase: matchPhase,
        teamAId: matchTeamAId,
        teamASource: matchTeamASource,
        teamBId: matchTeamBId,
        teamBSource: matchTeamBSource,
        scheduledAt: matchScheduledAt || null,
      });
      setMatchLabel(""); setMatchTeamAId(""); setMatchTeamBId(""); setMatchScheduledAt("");
      ok("Match créé !");
    } catch (e) { err(e); }
  }

  async function handleSaveMatchDate(matchId: string) {
    try {
      await apiCall("/api/admin/matches", "PATCH", {
        id: matchId,
        scheduledAt: editDateValue || null,
      });
      setEditDateMatchId(null);
      ok("Date mise à jour.");
    } catch (e) { err(e); }
  }

  async function handleDeleteMatch(id: string) {
    try { await apiCall(`/api/admin/matches?id=${id}`, "DELETE"); ok("Match supprimé."); }
    catch (e) { err(e); }
  }

  // ── Results ──
  async function handleSubmitResult() {
    if (!resultMatchId) return;
    const isCorrection = matches.find((m) => m.id === resultMatchId)?.status === "FINISHED";
    try {
      await apiCall("/api/admin/matches", "PATCH", {
        id: resultMatchId,
        scoreA: resultScoreA,
        scoreB: resultScoreB,
        result: resultWinner,
      });
      setResultMatchId(""); setResultScoreA(0); setResultScoreB(0);
      ok(isCorrection ? "Résultat corrigé ! Paris recalculés." : "Résultat enregistré ! Paris réglés.");
    } catch (e) { err(e); }
  }

  // ── Users ──
  async function handleCreateUser() {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      setMessage("Remplis tous les champs."); return;
    }
    try {
      await apiCall("/api/admin/users", "POST", {
        name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole,
      });
      setNewUserName(""); setNewUserEmail(""); setNewUserPassword(""); setNewUserRole("USER");
      ok("Joueur créé !");
    } catch (e) { err(e); }
  }

  async function handleToggleBan(userId: string, banned: boolean) {
    try { await apiCall("/api/admin/users", "PATCH", { id: userId, banned: !banned }); ok(banned ? "Joueur débanni." : "Joueur banni."); }
    catch (e) { err(e); }
  }

  async function handleDeleteUser(userId: string) {
    try { await apiCall(`/api/admin/users?id=${userId}`, "DELETE"); setConfirmDeleteUserId(null); ok("Compte supprimé."); }
    catch (e) { err(e); }
  }

  async function handleToggleRole(userId: string, role: string) {
    const newRole = role === "ADMIN" ? "USER" : "ADMIN";
    try { await apiCall("/api/admin/users", "PATCH", { id: userId, role: newRole }); ok(newRole === "ADMIN" ? "Rôle admin accordé." : "Rôle admin retiré."); }
    catch (e) { err(e); }
  }

  // ── Live toggle ──
  async function handleToggleLive(matchId: string, currentStatus: string) {
    const newStatus = currentStatus === "LIVE" ? "SCHEDULED" : "LIVE";
    try {
      await apiCall("/api/admin/matches", "PATCH", { id: matchId, status: newStatus });
      ok(newStatus === "LIVE" ? "Match passé en LIVE. Paris bloqués." : "Match repassé en SCHEDULED.");
    } catch (e) { err(e); }
  }

  // ── ELO inline save ──
  async function handleSaveElo(teamId: string) {
    const raw = eloEdits[teamId];
    if (raw === undefined) return;
    const newElo = parseInt(raw, 10);
    if (isNaN(newElo) || newElo < 0) return;
    const team = teams.find((t) => t.id === teamId);
    if (team && newElo === team.elo) {
      setEloEdits((prev) => { const n = { ...prev }; delete n[teamId]; return n; });
      return;
    }
    try {
      await apiCall("/api/admin/teams", "PATCH", { id: teamId, elo: newElo });
      setEloEdits((prev) => { const n = { ...prev }; delete n[teamId]; return n; });
      ok("ELO mis à jour.");
    } catch (e) { err(e); }
  }

  // ── Tirage ──
  async function handleLancerTirage() {
    setTirageLoading(true);
    try {
      const data = await apiCall("/api/admin/tirage", "POST") as { success: boolean; payload: TiragePayload; eventId: string };
      setTiragePayload(data.payload);
      setTirageEventId(data.eventId ?? null);
      router.refresh();
    } catch (e) { err(e); }
    finally { setTirageLoading(false); }
  }

  async function handleTirageStepChange(step: number) {
    if (!tirageEventId) return;
    await fetch("/api/admin/tirage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tirageEventId, step }),
    }).catch(() => {});
  }

  async function handleNextRound() {
    setNextRoundLoading(true);
    try {
      const data = await apiCall("/api/admin/tirage/next-round", "POST") as {
        wbCreated: number; lbCreated: number; grandFinal: boolean; byes: string[];
      };
      const msg = data.grandFinal
        ? "Finale BO3 générée !"
        : `Tour suivant généré : ${data.wbCreated} match(s) WB, ${data.lbCreated} match(s) LB.${data.byes.length ? ` (${data.byes.length} bye${data.byes.length > 1 ? "s" : ""})` : ""}`;
      ok(msg);
    } catch (e) { err(e); }
    finally { setNextRoundLoading(false); }
  }

  function handleTirageClose() {
    if (tirageEventId) {
      // Marquer terminé en DB — les viewers ne le reverront plus
      fetch("/api/admin/tirage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tirageEventId, end: true }),
      }).catch(() => {});
      // Aussi dans localStorage pour éviter le flash si le poll répond avant la DB
      try {
        const key = "tbt_tirage_seen_v1";
        const seen: string[] = JSON.parse(localStorage.getItem(key) ?? "[]");
        if (!seen.includes(tirageEventId)) {
          seen.push(tirageEventId);
          localStorage.setItem(key, JSON.stringify(seen));
        }
      } catch { /* ignore */ }
    }
    setTiragePayload(null);
    setTirageEventId(null);
  }

  // ── Tests ──
  const [testLoading, setTestLoading] = useState<string | null>(null);
  const [confirmTestPhase, setConfirmTestPhase] = useState<string | null>(null);

  async function handleSeedTest(phase: string) {
    setTestLoading(phase);
    try {
      await apiCall("/api/admin/seed-test", "POST", { phase });
      setConfirmTestPhase(null);
      ok(`Scénario « ${phase} » chargé (10 joueurs, paris posés).`);
    } catch (e) { err(e); }
    finally { setTestLoading(null); }
  }

  // ── Tools ──
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [toolLoading, setToolLoading] = useState<"reset" | "demo" | "giveWiz" | null>(null);
  const [giveWizAmount, setGiveWizAmount] = useState(10);

  async function handleGiveWiz() {
    setToolLoading("giveWiz");
    try {
      const data = await apiCall("/api/admin/give-wiz", "POST", { amount: giveWizAmount });
      ok(`+${giveWizAmount} Wiz distribués à ${data.usersUpdated} joueurs.`);
    } catch (e) { err(e); }
    finally { setToolLoading(null); }
  }

  async function handleReset() {
    setToolLoading("reset");
    try { await apiCall("/api/admin/reset", "POST"); setConfirmReset(false); ok("Données réinitialisées."); }
    catch (e) { err(e); }
    finally { setToolLoading(null); }
  }

  async function handleSeedDemo() {
    setToolLoading("demo");
    try { await apiCall("/api/admin/seed-demo", "POST"); setConfirmDemo(false); ok("Données de démo injectées !"); }
    catch (e) { err(e); }
    finally { setToolLoading(null); }
  }

  const pendingMatches = matches.filter((m) => m.status === "SCHEDULED" || m.status === "LIVE");

  // Groupement de la liste : TOUS les matchs, datés → par jour, sans date → par poule / bracket
  const matchesGrouped = (() => {
    const poolMap = new Map(pools.map((p) => [p.id, p]));
    const withDate = matches
      .filter((m): m is Match & { scheduledAt: Date | string } => m.scheduledAt != null)
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
    const noDate = matches.filter((m) => !m.scheduledAt);

    const byDayMap = new Map<string, Match[]>();
    for (const m of withDate) {
      const key = dayKey(m.scheduledAt);
      if (!byDayMap.has(key)) byDayMap.set(key, []);
      byDayMap.get(key)!.push(m);
    }

    const byPoolMap = new Map<string, Match[]>();
    const bracket: Match[] = [];
    for (const m of noDate) {
      if (m.phase === "POOL" && m.teamA.poolId) {
        if (!byPoolMap.has(m.teamA.poolId)) byPoolMap.set(m.teamA.poolId, []);
        byPoolMap.get(m.teamA.poolId)!.push(m);
      } else {
        bracket.push(m);
      }
    }
    return { byDay: [...byDayMap.entries()], byPool: [...byPoolMap.entries()], bracket, poolMap };
  })();

  const selectedMatchForResult = matches.find((m) => m.id === resultMatchId);
  const poolMatches = matches
    .filter((m) => m.phase === "POOL")
    .sort((a, b) => {
      if (!a.scheduledAt && !b.scheduledAt) return 0;
      if (!a.scheduledAt) return -1;
      if (!b.scheduledAt) return 1;
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
    });
  const bracketMatches = matches.filter((m) => m.phase !== "POOL");

  const allowDrawResult = selectedMatchForResult?.phase === "POOL";
  const resultChoices: Array<"TEAM_A" | "DRAW" | "TEAM_B"> = allowDrawResult
    ? ["TEAM_A", "DRAW", "TEAM_B"]
    : ["TEAM_A", "TEAM_B"];

  const formatDate = (d: Date | string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  // Statut pour l'onglet tirage
  const poolsDone = matches.filter((m) => m.phase === "POOL" && m.status !== "FINISHED").length === 0;
  const hasPools = matches.some((m) => m.phase === "POOL");
  const bracketExists = matches.some((m) => ["WINNER_BRACKET", "LOSER_BRACKET"].includes(m.phase));

  return (
    <div className="space-y-4">
      {/* Overlay tirage admin */}
      {tiragePayload && (
        <TirageOverlay
          payload={tiragePayload}
          isAdmin={true}
          onStepChange={handleTirageStepChange}
          onClose={handleTirageClose}
        />
      )}

      {/* Input fichier caché — partagé par tous les logos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
      />

      {/* Tabs */}
      <div className="rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)] p-1">
        <div className="flex flex-wrap gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                tab === key
                  ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                  : "text-[var(--color-muted)] hover:text-[var(--color-cream)]"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="rounded-lg bg-[var(--color-accent)]/10 p-2 text-xs text-[var(--color-accent)]">
          {message}
          <button onClick={() => setMessage(null)} className="ml-2 underline">OK</button>
        </div>
      )}

      {/* ── Teams ── */}
      {tab === "teams" && (
        <div className="space-y-4">
          {/* Créer une équipe */}
          <Card className="p-3 space-y-2">
            <h3 className="text-sm font-semibold">Créer une équipe</h3>
            <div className="flex gap-3 items-start">
              {/* Aperçu logo création — cliquable pour uploader */}
              <button
                type="button"
                onClick={() => triggerUpload("create")}
                disabled={uploading}
                className="shrink-0 relative group size-14 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] overflow-hidden flex items-center justify-center"
                title="Uploader une image"
              >
                {teamLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={teamLogoUrl}
                    alt="aperçu"
                    className="size-full object-contain"
                    onError={(e) => { e.currentTarget.style.opacity = "0.2"; }}
                  />
                ) : (
                  <ImageIcon className="size-5 text-[var(--color-muted)]" />
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="size-4 text-white" />
                </div>
              </button>
              <div className="flex-1 space-y-2">
                <input placeholder="Nom de l'équipe *" value={teamName} onChange={(e) => setTeamName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
                <input placeholder="Joueur 1 (optionnel)" value={teamPlayer1} onChange={(e) => setTeamPlayer1(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
                <input placeholder="Joueur 2 (optionnel)" value={teamPlayer2} onChange={(e) => setTeamPlayer2(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    placeholder="URL du logo (https://...)"
                    value={teamLogoUrl}
                    onChange={(e) => setTeamLogoUrl(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => triggerUpload("create")}
                    disabled={uploading}
                    className="shrink-0 flex items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2.5 py-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-cream)] disabled:opacity-40"
                    title="Uploader JPG/PNG"
                  >
                    <Upload className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <Button onClick={handleCreateTeam} className="w-full text-xs">
              <Plus className="size-3.5 mr-1" /> Créer
            </Button>
          </Card>

          {/* Liste équipes — groupées par poule */}
          {(() => {
            const teamsWithoutPool = teams.filter((t) => !t.poolId);
            const teamsByPool = pools.map((pool) => ({
              pool,
              teams: teams.filter((t) => t.poolId === pool.id),
            }));

            return (
              <div className="space-y-4">
                {/* Équipes sans poule */}
                {teamsWithoutPool.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1.5">
                      Sans poule ({teamsWithoutPool.length})
                    </h3>
                    <div className="space-y-1">
                      {teamsWithoutPool.map((team) => renderTeamCard(team))}
                    </div>
                  </div>
                )}

                {/* Équipes par poule */}
                {teamsByPool.map(({ pool, teams: poolTeams }) =>
                  poolTeams.length > 0 ? (
                    <div key={pool.id}>
                      <h3
                        className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                        style={{ color: pool.color }}
                      >
                        {pool.name} ({poolTeams.length})
                      </h3>
                      <div className="space-y-1">
                        {poolTeams.map((team) => renderTeamCard(team))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            );

            function renderTeamCard(team: Team) {
              return (
                <Card key={team.id} className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Logo cliquable → ouvre le sélecteur de fichier */}
                    <button
                      onClick={() => triggerUpload(team.id)}
                      disabled={uploading}
                      className="shrink-0 relative group size-12 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] overflow-hidden flex items-center justify-center"
                      title="Changer le logo"
                    >
                      {team.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logoUrl} alt={team.name} className="size-full object-contain" />
                      ) : (
                        <ImageIcon className="size-4 text-[var(--color-muted)]" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload className="size-4 text-white" />
                      </div>
                    </button>

                    {/* Info + pool */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{team.name}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-mono text-[var(--color-muted)]">ELO</span>
                          <input
                            type="number"
                            value={eloEdits[team.id] ?? team.elo}
                            onChange={(e) => setEloEdits((prev) => ({ ...prev, [team.id]: e.target.value }))}
                            onBlur={() => handleSaveElo(team.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveElo(team.id); }}
                            className="w-16 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-1 py-0.5 text-[10px] font-mono text-[var(--color-accent)] text-center outline-none focus:border-[var(--color-accent)]/60"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-[var(--color-muted)]">
                        {[team.player1, team.player2].filter(Boolean).join(" & ") || "—"}
                      </p>
                      <select
                        value={team.poolId ?? ""}
                        onChange={(e) => handleAssignTeamToPool(team.id, e.target.value)}
                        className="mt-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px]"
                      >
                        <option value="">Pas de poule</option>
                        {pools.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>

                    <button onClick={() => handleDeleteTeam(team.id)} className="shrink-0 text-red-400 hover:text-red-300 mt-0.5">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </Card>
              );
            }
          })()}
        </div>
      )}

      {/* ── Pools ── */}
      {tab === "pools" && (
        <div className="space-y-4">
          <Card className="p-3 space-y-2">
            <h3 className="text-sm font-semibold">Créer une poule</h3>
            <div className="flex gap-2">
              <input placeholder="Nom (ex: Poule A)" value={poolName} onChange={(e) => setPoolName(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
              <div className="relative shrink-0">
                <input type="color" value={poolColor} onChange={(e) => setPoolColor(e.target.value)}
                  className="size-9 cursor-pointer rounded-lg border border-[var(--color-border-subtle)] p-0.5 bg-[var(--color-surface-2)]" />
              </div>
            </div>
            <Button onClick={handleCreatePool} className="w-full text-xs">
              <Plus className="size-3.5 mr-1" /> Créer
            </Button>
          </Card>

          {pools.map((pool) => {
            const pendingColor = poolColorEdits[pool.id] ?? pool.color;
            const colorDirty = pendingColor !== pool.color;
            return (
            <Card key={pool.id} className="overflow-hidden">
              {/* Bandeau coloré */}
              <div className="h-1 w-full transition-colors" style={{ background: pendingColor }} />
              <div className="p-3">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="color"
                      value={pendingColor}
                      onChange={(e) => setPoolColorEdits((prev) => ({ ...prev, [pool.id]: e.target.value }))}
                      className="size-6 cursor-pointer rounded border border-[var(--color-border-subtle)] p-0 bg-transparent shrink-0"
                      title="Couleur de la poule"
                    />
                    <h3 className="text-sm font-semibold truncate">
                      {pool.name}
                      <span className="ml-1 text-[10px] font-normal text-[var(--color-muted)]">
                        ({pool.teams.length} équipe{pool.teams.length > 1 ? "s" : ""})
                      </span>
                    </h3>
                    {colorDirty && (
                      <button
                        onClick={() => handleUpdatePoolColor(pool.id, pendingColor)}
                        className="shrink-0 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[9px] font-bold text-black hover:brightness-110"
                      >
                        Sauvegarder
                      </button>
                    )}
                  </div>
                  <button onClick={() => handleDeletePool(pool.id)} className="shrink-0 text-red-400 hover:text-red-300">
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {pool.teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <TeamLogo url={team.logoUrl} name={team.name} className="size-5 rounded" />
                        <span>{team.name}</span>
                      </div>
                      <button onClick={() => handleAssignTeamToPool(team.id, "")}
                        className="text-[10px] text-red-400 hover:underline">Retirer</button>
                    </div>
                  ))}
                  {pool.teams.length === 0 && <p className="text-xs text-[var(--color-muted)]">Vide</p>}
                </div>
              </div>
            </Card>
          );
          })}
        </div>
      )}

      {/* ── Matches ── */}
      {tab === "matches" && (
        <div className="space-y-4">
          {/* Générer automatiquement */}
          <Card className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">Matchs de poules</h3>
                <p className="text-[10px] text-[var(--color-muted)] mt-0.5">
                  Génère tous les matchs aller (round-robin) de chaque poule. Assigne les poules aux équipes d&apos;abord.
                </p>
              </div>
              <Button onClick={handleGeneratePoolMatches} className="text-xs shrink-0">
                <RefreshCw className="size-3.5 mr-1" /> Générer
              </Button>
            </div>
          </Card>


          {/* Matchs de poules sans date → admin met la date */}
          {poolMatches.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                Poules ({poolMatches.length})
              </h3>
              <div className="space-y-1">
                {poolMatches.map((match) => (
                  <Card key={match.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{match.label}</p>
                        <p className="text-[10px] text-[var(--color-muted)]">
                          {match.teamA.name} vs {match.teamB?.name ?? "À déterminer"}
                        </p>
                        {match.scheduledAt ? (
                          <p className="text-[10px] text-green-400">{formatDate(match.scheduledAt)}</p>
                        ) : (
                          <p className="text-[10px] text-orange-400">Pas encore programmé</p>
                        )}
                        {match.status === "FINISHED" && (
                          <p className="text-[10px] text-[var(--color-muted)]">
                            Terminé : {match.scoreA} - {match.scoreB}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 items-center">
                        {match.status !== "FINISHED" && (
                          <input
                            type="datetime-local"
                            className="w-[130px] rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-1.5 py-1 text-[10px] text-[var(--color-cream)] [color-scheme:dark]"
                            value={editDateMatchId === match.id
                              ? editDateValue
                              : (match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "")}
                            onFocus={() => {
                              setEditDateMatchId(match.id);
                              setEditDateValue(match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "");
                            }}
                            onChange={(e) => setEditDateValue(e.target.value)}
                            onBlur={() => handleSaveMatchDate(match.id)}
                          />
                        )}
                        <button onClick={() => handleDeleteMatch(match.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Créer un match (bracket / finale) */}
          <Card className="p-3 space-y-2">
            <h3 className="text-sm font-semibold">Créer un match (bracket / finale)</h3>
            <input placeholder="Label (ex: Quart 1)" value={matchLabel} onChange={(e) => setMatchLabel(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
            <select value={matchPhase} onChange={(e) => setMatchPhase(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm">
              {PHASES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[var(--color-muted)]">Équipe A</label>
                <select value={matchTeamAId} onChange={(e) => setMatchTeamAId(e.target.value)}
                  className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-xs">
                  <option value="">—</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={matchTeamASource} onChange={(e) => setMatchTeamASource(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-[10px]">
                  {SOURCES.map((s) => <option key={s.value} value={s.value}>Source : {s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[var(--color-muted)]">Équipe B</label>
                <select value={matchTeamBId} onChange={(e) => setMatchTeamBId(e.target.value)}
                  className="w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-xs">
                  <option value="">—</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <select value={matchTeamBSource} onChange={(e) => setMatchTeamBSource(e.target.value)}
                  className="mt-1 w-full rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-[10px]">
                  {SOURCES.map((s) => <option key={s.value} value={s.value}>Source : {s.label}</option>)}
                </select>
              </div>
            </div>
            <input type="datetime-local" value={matchScheduledAt} onChange={(e) => setMatchScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
            <Button onClick={handleCreateMatch} className="w-full text-xs">
              <Plus className="size-3.5 mr-1" /> Créer le match
            </Button>
          </Card>

          {/* Bracket matches */}
          {bracketMatches.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                Bracket / Finale ({bracketMatches.length})
              </h3>
              <div className="space-y-1">
                {bracketMatches.map((match) => (
                  <Card key={match.id} className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">
                          {match.label} · <span className="text-[var(--color-muted)]">{match.phase}</span>
                        </p>
                        <p className="text-[10px] text-[var(--color-muted)]">
                          {match.teamA.name} vs {match.teamB?.name ?? "À déterminer"}
                        </p>
                        {match.status === "FINISHED" && (
                          <p className="text-[10px] text-green-400">{match.scoreA} - {match.scoreB}</p>
                        )}
                        {match.scheduledAt && (
                          <p className="text-[10px] text-[var(--color-muted)]">{formatDate(match.scheduledAt)}</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0 items-center">
                        {match.status !== "FINISHED" && (
                          <input
                            type="datetime-local"
                            className="w-[130px] rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-1.5 py-1 text-[10px] text-[var(--color-cream)] [color-scheme:dark]"
                            value={editDateMatchId === match.id
                              ? editDateValue
                              : (match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "")}
                            onFocus={() => {
                              setEditDateMatchId(match.id);
                              setEditDateValue(match.scheduledAt ? new Date(match.scheduledAt).toISOString().slice(0, 16) : "");
                            }}
                            onChange={(e) => setEditDateValue(e.target.value)}
                            onBlur={() => handleSaveMatchDate(match.id)}
                          />
                        )}
                        <button onClick={() => handleDeleteMatch(match.id)} className="text-red-400 hover:text-red-300 shrink-0">
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Results ── */}
      {tab === "results" && (
        <div className="space-y-4">
          <Card className="p-3 space-y-2">
            <h3 className="text-sm font-semibold">Saisir un résultat</h3>
            {/* Liste des matchs en attente — groupée par date puis par poule */}
            <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-1.5 space-y-2">
              {pendingMatches.length === 0 && (
                <p className="text-xs text-[var(--color-muted)] text-center py-2">Aucun match.</p>
              )}

              {/* Matchs datés → groupés par jour */}
              {matchesGrouped.byDay.map(([dayKeyStr, dayMatches]) => (
                <div key={dayKeyStr}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] px-1.5 py-1">
                    {dayLabel(dayMatches[0]!.scheduledAt!)}
                  </p>
                  {dayMatches.map((m) => {
                    const pool = m.phase === "POOL" && m.teamA.poolId
                      ? matchesGrouped.poolMap.get(m.teamA.poolId)
                      : null;
                    const phaseBadge =
                      m.phase === "WINNER_BRACKET" ? { label: "Winners", color: "#F5C400" } :
                      m.phase === "LOSER_BRACKET"  ? { label: "Losers", color: "#F97316" } :
                      m.phase === "FINAL_SERIES"   ? { label: "Finale", color: "#A78BFA" } :
                      null;
                    const isSelected = resultMatchId === m.id;
                    const isDone = m.status === "FINISHED";
                    const isLive = m.status === "LIVE";
                    return (
                      <div key={m.id} className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const selecting = !isSelected;
                            setResultMatchId(selecting ? m.id : "");
                            if (selecting) {
                              setResultScoreA(m.scoreA ?? 0);
                              setResultScoreB(m.scoreB ?? 0);
                              if (m.result) setResultWinner(m.result as "TEAM_A" | "TEAM_B" | "DRAW");
                              else if (m.phase !== "POOL") setResultWinner("TEAM_A");
                            }
                          }}
                          className={cn(
                            "flex-1 text-left rounded-md px-2 py-1.5 text-xs transition-colors flex items-center gap-1.5",
                            isSelected
                              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                              : isDone
                              ? "text-[var(--color-muted)] hover:bg-[var(--color-surface-1)]"
                              : "text-[var(--color-cream)] hover:bg-[var(--color-surface-1)]"
                          )}
                        >
                          {pool && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                              style={{ background: pool.color + "30", color: pool.color }}
                            >
                              {pool.name}
                            </span>
                          )}
                          {phaseBadge && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                              style={{ background: phaseBadge.color + "30", color: phaseBadge.color }}
                            >
                              {phaseBadge.label}
                            </span>
                          )}
                          {isLive && (
                            <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-bold text-red-400">
                              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
                            </span>
                          )}
                          <span className="flex-1 font-medium truncate">{m.teamA.name} vs {m.teamB?.name ?? "À déterminer"}</span>
                          {isDone ? (
                            <span className="shrink-0 text-[10px] text-green-400 font-bold">✓ {m.scoreA}-{m.scoreB}</span>
                          ) : (
                            <span className="shrink-0 text-[9px] text-[var(--color-muted)]">
                              {formatKickoffTime(m.scheduledAt!)}
                            </span>
                          )}
                        </button>
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => handleToggleLive(m.id, m.status)}
                            title={isLive ? "Désactiver LIVE" : "Passer en LIVE"}
                            className={cn(
                              "shrink-0 rounded-md px-1.5 text-[9px] font-bold transition-colors",
                              isLive
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : "bg-[var(--color-surface-1)] text-[var(--color-muted)] hover:text-red-400"
                            )}
                          >
                            {isLive ? "⏸" : "🔴"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Matchs sans date → groupés par poule */}
              {matchesGrouped.byPool.map(([poolId, poolMatches]) => {
                const pool = matchesGrouped.poolMap.get(poolId);
                return (
                  <div key={poolId}>
                    <p
                      className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-1"
                      style={pool ? { color: pool.color } : undefined}
                    >
                      {pool?.name ?? "Poule"}
                    </p>
                    {poolMatches.map((m) => {
                      const isSelected = resultMatchId === m.id;
                      const isDone = m.status === "FINISHED";
                      const isLive = m.status === "LIVE";
                      return (
                        <div key={m.id} className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const selecting = !isSelected;
                              setResultMatchId(selecting ? m.id : "");
                              if (selecting) {
                                setResultScoreA(m.scoreA ?? 0);
                                setResultScoreB(m.scoreB ?? 0);
                                if (m.result) setResultWinner(m.result as "TEAM_A" | "TEAM_B" | "DRAW");
                              }
                            }}
                            className={cn(
                              "flex-1 text-left rounded-md px-2 py-1.5 text-xs transition-colors flex items-center gap-1.5",
                              isSelected
                                ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                                : isDone
                                ? "text-[var(--color-muted)] hover:bg-[var(--color-surface-1)]"
                                : "text-[var(--color-cream)] hover:bg-[var(--color-surface-1)]"
                            )}
                          >
                            {isLive && (
                              <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-bold text-red-400">
                                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
                              </span>
                            )}
                            <span className="flex-1 font-medium truncate">{m.teamA.name} vs {m.teamB?.name ?? "À déterminer"}</span>
                            {isDone && (
                              <span className="shrink-0 text-[10px] text-green-400 font-bold">✓ {m.scoreA}-{m.scoreB}</span>
                            )}
                          </button>
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => handleToggleLive(m.id, m.status)}
                              title={isLive ? "Désactiver LIVE" : "Passer en LIVE"}
                              className={cn(
                                "shrink-0 rounded-md px-1.5 text-[9px] font-bold transition-colors",
                                isLive
                                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                  : "bg-[var(--color-surface-1)] text-[var(--color-muted)] hover:text-red-400"
                              )}
                            >
                              {isLive ? "⏸" : "🔴"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Matchs sans date de bracket / finale */}
              {matchesGrouped.bracket.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-muted)] px-1.5 py-1">
                    Bracket / Finale
                  </p>
                  {matchesGrouped.bracket.map((m) => {
                    const isSelected = resultMatchId === m.id;
                    const isDone = m.status === "FINISHED";
                    const isLive = m.status === "LIVE";
                    return (
                      <div key={m.id} className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const selecting = !isSelected;
                            setResultMatchId(selecting ? m.id : "");
                            if (selecting) {
                              setResultScoreA(m.scoreA ?? 0);
                              setResultScoreB(m.scoreB ?? 0);
                              if (m.result) setResultWinner(m.result as "TEAM_A" | "TEAM_B" | "DRAW");
                              else setResultWinner("TEAM_A");
                            }
                          }}
                          className={cn(
                            "flex-1 text-left rounded-md px-2 py-1.5 text-xs transition-colors flex items-center gap-1.5",
                            isSelected
                              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                              : isDone
                              ? "text-[var(--color-muted)] hover:bg-[var(--color-surface-1)]"
                              : "text-[var(--color-cream)] hover:bg-[var(--color-surface-1)]"
                          )}
                        >
                          {isLive && (
                            <span className="shrink-0 flex items-center gap-0.5 text-[8px] font-bold text-red-400">
                              <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />LIVE
                            </span>
                          )}
                          <span className="flex-1 font-medium truncate">{m.teamA.name} vs {m.teamB?.name ?? "À déterminer"}</span>
                          {isDone ? (
                            <span className="shrink-0 text-[10px] text-green-400 font-bold">✓ {m.scoreA}-{m.scoreB}</span>
                          ) : m.label && !m.label.includes(" vs ") ? (
                            <span className="shrink-0 text-[9px] text-[var(--color-muted)]">{m.label}</span>
                          ) : null}
                        </button>
                        {!isDone && (
                          <button
                            type="button"
                            onClick={() => handleToggleLive(m.id, m.status)}
                            title={isLive ? "Désactiver LIVE" : "Passer en LIVE"}
                            className={cn(
                              "shrink-0 rounded-md px-1.5 text-[9px] font-bold transition-colors",
                              isLive
                                ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                : "bg-[var(--color-surface-1)] text-[var(--color-muted)] hover:text-red-400"
                            )}
                          >
                            {isLive ? "⏸" : "🔴"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {resultMatchId && (() => {
              const m = matches.find((x) => x.id === resultMatchId);
              return m ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium flex-1 text-center">{m.teamA.name}</span>
                    <input type="number" min={0} value={resultScoreA} onChange={(e) => setResultScoreA(Number(e.target.value))}
                      className="w-14 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-center text-sm" />
                    <span className="text-sm text-[var(--color-muted)]">-</span>
                    <input type="number" min={0} value={resultScoreB} onChange={(e) => setResultScoreB(Number(e.target.value))}
                      className="w-14 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-center text-sm" />
                    <span className="text-xs font-medium flex-1 text-center">{m.teamB?.name ?? "?"}</span>
                  </div>
                  <div className={`flex gap-2`}>
                    {resultChoices.map((r) => (
                      <button key={r} onClick={() => setResultWinner(r)}
                        className={cn(
                          "flex-1 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                          resultWinner === r
                            ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                            : "border-[var(--color-border-subtle)] text-[var(--color-muted)]"
                        )}>
                        {r === "TEAM_A" ? `✓ ${m.teamA.name}` : r === "TEAM_B" ? `✓ ${m.teamB?.name ?? "?"}` : "Égalité"}
                      </button>
                    ))}
                  </div>
                </>
              ) : null;
            })()}

            <Button onClick={handleSubmitResult} disabled={!resultMatchId} className="w-full text-xs">
              <CheckCircle2 className="size-3.5 mr-1" />
              {selectedMatchForResult?.status === "FINISHED" ? "Corriger le résultat" : "Enregistrer + Régler les paris"}
            </Button>
          </Card>

          {/* Résultats déjà saisis */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
              Matchs terminés
            </h3>
            <div className="space-y-1">
              {matches.filter((m) => m.status === "FINISHED").map((m) => (
                <Card key={m.id} className="p-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--color-muted)]">{m.label}</span>
                    <span className="font-bold">{m.scoreA} - {m.scoreB}</span>
                  </div>
                  <p className="text-[10px] text-[var(--color-muted)]">{m.teamA.name} vs {m.teamB?.name ?? "À déterminer"}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      {tab === "users" && (
        <div className="space-y-4">
          {/* Créer un joueur */}
          <Card className="p-3 space-y-2">
            <h3 className="text-sm font-semibold">Créer un joueur</h3>
            <input placeholder="Nom affiché *" value={newUserName} onChange={(e) => setNewUserName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
            <input placeholder="Email *" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
            <input placeholder="Mot de passe (min 6 car.) *" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm" />
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as "USER" | "ADMIN")}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm">
              <option value="USER">Joueur</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button onClick={handleCreateUser} className="w-full text-xs">
              <Plus className="size-3.5 mr-1" /> Créer le compte
            </Button>
          </Card>

          {/* Liste joueurs */}
          <div className="space-y-1">
            {users.map((user) => (
              <Card key={user.id} className="flex items-center justify-between p-3">
                <div>
                  <p className="text-sm font-medium">
                    {user.name || "Anonyme"}
                    {user.role === "ADMIN" && (
                      <span className="ml-1 text-[10px] text-[var(--color-accent)]">ADMIN</span>
                    )}
                    {user.banned && (
                      <span className="ml-1 text-[10px] text-red-400">banni</span>
                    )}
                  </p>
                  <p className="text-[10px] text-[var(--color-muted)]">
                    {user.email} · {user.wizzBalance} Wizz · {user.jokersLeft} jokers
                  </p>
                </div>
                {user.id !== currentUserId && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleRole(user.id, user.role)}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        user.role === "ADMIN"
                          ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          : "bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-cream)]"
                      )}
                    >
                      {user.role === "ADMIN" ? "Retirer admin" : "Rendre admin"}
                    </button>
                    <button
                      onClick={() => handleToggleBan(user.id, user.banned)}
                      className={cn(
                        "text-xs px-2 py-1 rounded",
                        user.banned ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                      )}
                    >
                      {user.banned ? "Débannir" : "Bannir"}
                    </button>
                    {confirmDeleteUserId === user.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-xs px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDeleteUserId(null)}
                          className="text-xs px-2 py-1 rounded bg-[var(--color-surface-2)] text-[var(--color-muted)]"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteUserId(user.id)}
                        className="text-red-400 hover:text-red-300"
                        title="Supprimer le compte"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Tirage ── */}
      {tab === "tirage" && (
        <div className="space-y-4">
          {/* Status */}
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Shuffle className="size-4 text-[var(--color-accent)]" />
              Tirage au sort du bracket
            </h3>

            <div className="space-y-1.5">
              <StatusRow
                label="Matchs de poule"
                ok={hasPools && poolsDone}
                text={!hasPools ? "Aucun match de poule" : poolsDone ? "Tous terminés ✓" : "En cours…"}
              />
              <StatusRow
                label="Bracket"
                ok={!bracketExists}
                text={bracketExists ? "Matchs bracket existants" : "Vide — prêt pour le tirage"}
                invert
              />
            </div>

            <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
              Le tirage crée aléatoirement les matchs WB et LB du Tour 1 et envoie l&apos;animation à tous les joueurs en temps réel.
            </p>

            <Button
              onClick={handleLancerTirage}
              disabled={tirageLoading || !hasPools || !poolsDone || bracketExists}
              className="w-full bg-[var(--color-accent)] text-black font-bold hover:opacity-90 disabled:opacity-40"
            >
              {tirageLoading ? "Tirage en cours…" : bracketExists ? "Bracket déjà généré" : "🎲 Lancer le tirage au sort"}
            </Button>

            {bracketExists && (
              <p className="text-[10px] text-[var(--color-muted)] text-center">
                Pour relancer, supprimez d&apos;abord les matchs bracket dans l&apos;onglet Matchs.
              </p>
            )}
          </Card>

          {/* Bracket existant résumé */}
          {bracketExists && (
            <Card className="p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Bracket actuel
              </h4>
              {["WINNER_BRACKET", "LOSER_BRACKET"].map((phase) => {
                const phaseMatches = matches.filter((m) => m.phase === phase);
                if (phaseMatches.length === 0) return null;
                const label = phase === "WINNER_BRACKET" ? "Winner Bracket" : "Loser Bracket";
                const color = phase === "WINNER_BRACKET" ? "#F5C400" : "#F97316";
                return (
                  <div key={phase}>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5" style={{ color }}>
                      {label}
                    </p>
                    <div className="space-y-1">
                      {phaseMatches.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 text-xs py-1">
                          <span className="flex-1 truncate font-medium">{m.teamA.name}</span>
                          <span className="shrink-0 text-[var(--color-muted)]">vs</span>
                          <span className="flex-1 truncate font-medium text-right">{m.teamB?.name ?? "?"}</span>
                          {m.status === "FINISHED" && (
                            <span className="shrink-0 text-[10px] text-green-400 font-bold">✓ {m.scoreA}-{m.scoreB}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {/* Générer le tour suivant */}
          {bracketExists && (() => {
            const pendingBracket = matches.some(
              (m) => ["WINNER_BRACKET", "LOSER_BRACKET"].includes(m.phase) && ["SCHEDULED", "LIVE"].includes(m.status)
            );
            const finishedBracket = matches.some(
              (m) => ["WINNER_BRACKET", "LOSER_BRACKET"].includes(m.phase) && m.status === "FINISHED"
            );
            const hasFinal = matches.some((m) => m.phase === "FINAL_SERIES");
            if (!finishedBracket || hasFinal) return null;
            return (
              <Card className="p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-2">
                  <Shuffle className="size-3.5" /> Tour suivant
                </h4>
                <p className="text-[11px] text-[var(--color-muted)] leading-relaxed">
                  {pendingBracket
                    ? "Des matchs sont encore en cours. Saisissez tous les résultats avant de générer le tour suivant."
                    : "Tous les matchs du tour sont terminés. Le système va créer les matchs suivants automatiquement (bye si nombre impair)."}
                </p>
                <Button
                  onClick={handleNextRound}
                  disabled={pendingBracket || nextRoundLoading}
                  className="w-full font-bold disabled:opacity-40"
                >
                  {nextRoundLoading ? "Génération…" : "⚡ Générer le tour suivant"}
                </Button>
              </Card>
            );
          })()}
        </div>
      )}

      {/* ── ELO ── */}
      {tab === "elo" && (() => {
        const teamsByElo = [...teams].sort((a, b) => b.elo - a.elo);
        const eloMatches = matches
          .filter((m) => m.status === "FINISHED" && (m.eloChangeA !== null || m.eloChangeB !== null))
          .sort((a, b) => {
            if (!a.scheduledAt && !b.scheduledAt) return 0;
            if (!a.scheduledAt) return 1;
            if (!b.scheduledAt) return -1;
            return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
          });

        function eloTag(delta: number | null) {
          if (delta === null) return null;
          const sign = delta > 0 ? "+" : "";
          return (
            <span className={`text-[9px] font-bold font-mono ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-[var(--color-muted)]"}`}>
              {sign}{delta}
            </span>
          );
        }

        return (
          <div className="space-y-4">
            {/* Classement ELO actuel */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                Classement ELO actuel
              </h3>
              <Card className="overflow-hidden divide-y divide-[var(--color-border-subtle)]">
                {teamsByElo.map((team, i) => (
                  <div key={team.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="w-5 shrink-0 text-[10px] text-[var(--color-muted)] text-center font-mono">{i + 1}</span>
                    <div className="size-6 shrink-0 rounded overflow-hidden">
                      {team.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={team.logoUrl} alt={team.name} className="size-full object-contain" />
                      ) : (
                        <div className="size-full bg-[var(--color-surface-2)]" />
                      )}
                    </div>
                    <span className="flex-1 text-xs font-medium truncate">{team.name}</span>
                    <span className="shrink-0 text-xs font-black font-mono text-[var(--color-accent)]">{team.elo}</span>
                  </div>
                ))}
              </Card>
            </div>

            {/* Historique des deltas ELO */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-2">
                Historique ELO par match
              </h3>
              {eloMatches.length === 0 ? (
                <Card className="p-4 text-center text-xs text-[var(--color-muted)]">
                  Aucun match terminé avec deltas ELO.
                </Card>
              ) : (
                <div className="space-y-1">
                  {eloMatches.map((m) => (
                    <Card key={m.id} className="p-2.5">
                      <p className="text-[9px] text-[var(--color-muted)] mb-1.5">
                        {m.label}{m.scheduledAt ? ` · ${formatDate(m.scheduledAt)}` : ""}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex-1 truncate font-medium">{m.teamA.name}</span>
                        {eloTag(m.eloChangeA)}
                        <span className="shrink-0 font-black tabular-nums text-[var(--color-muted)]">
                          {m.scoreA} – {m.scoreB}
                        </span>
                        {eloTag(m.eloChangeB)}
                        <span className="flex-1 truncate font-medium text-right">{m.teamB?.name ?? "?"}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Tests ── */}
      {tab === "tests" && (() => {
        const scenarios = [
          {
            key: "pre-pools-end",
            title: "Fin de poules imminente",
            color: "#3498DB",
            icon: "🏆",
            description: "Poule A : 2/3 matchs terminés. Poule B : terminée. Poule C : 5/6 terminés. 2 matchs restants avec paris en attente.",
            detail: "10 joueurs · paris sur Sultans/Pharaons et Rapaces/Faucons",
          },
          {
            key: "post-bracket-r1",
            title: "Fin Tour 1 bracket",
            color: "#F5C400",
            icon: "⚡",
            description: "Toutes les poules terminées. WB R1 et LB R1 joués. WB R2 et LB R2 à venir (4 matchs).",
            detail: "10 joueurs · paris sur les 4 matchs du tour 2",
          },
          {
            key: "pre-finale",
            title: "Juste avant la finale",
            color: "#A78BFA",
            icon: "🎯",
            description: "Bracket complet terminé. Les Rapaces (WB) affrontent Les Lions (LB) en Finale BO3 — 3 matchs pré-créés.",
            detail: "10 joueurs · paris répartis sur les 3 matchs de la finale",
          },
        ] as const;

        return (
          <div className="space-y-3">
            <p className="text-xs text-[var(--color-muted)] leading-relaxed">
              Chaque scénario réinitialise complètement la base (équipes, matchs, paris) tout en conservant les comptes admin,
              puis injecte 10 joueurs démo (<span className="font-mono">Demo1234!</span>) et des paris sur les matchs à venir.
            </p>

            {scenarios.map((s) => (
              <Card key={s.key} className="p-4 space-y-3" style={{ borderColor: s.color + "33" }}>
                <div className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold" style={{ color: s.color }}>{s.title}</h3>
                    <p className="text-xs text-[var(--color-muted)] mt-0.5 leading-relaxed">{s.description}</p>
                    <p className="text-[10px] mt-1 font-mono" style={{ color: s.color + "cc" }}>{s.detail}</p>
                  </div>
                </div>

                {confirmTestPhase === s.key ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-center" style={{ color: s.color }}>
                      ⚠ Les données actuelles seront remplacées. Confirmer ?
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSeedTest(s.key)}
                        disabled={testLoading === s.key}
                        className="flex-1 text-xs font-bold"
                        style={{ background: s.color, color: "#000" }}
                      >
                        {testLoading === s.key ? "Chargement…" : "Oui, charger"}
                      </Button>
                      <Button
                        onClick={() => setConfirmTestPhase(null)}
                        className="flex-1 text-xs bg-[var(--color-surface-2)] text-[var(--color-muted)]"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setConfirmTestPhase(s.key)}
                    disabled={testLoading !== null}
                    className="w-full text-xs font-semibold"
                    style={{ background: s.color + "20", color: s.color, border: `1px solid ${s.color}44` }}
                  >
                    {s.icon} Charger ce scénario
                  </Button>
                )}
              </Card>
            ))}
          </div>
        );
      })()}

      {tab === "tools" && (
        <div className="space-y-4">
          {/* Reset */}
          <Card className="p-4 space-y-3 border border-red-500/20">
            <div className="flex items-start gap-3">
              <RotateCcw className="size-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-red-400">Réinitialiser les données</h3>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Supprime toutes les équipes, poules, matchs, paris et joueurs.
                  Le compte admin est conservé (solde remis à 100 Wiz).
                </p>
              </div>
            </div>
            {!confirmReset ? (
              <Button
                onClick={() => setConfirmReset(true)}
                className="w-full text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30"
              >
                <RotateCcw className="size-3.5 mr-1" /> Réinitialiser
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-red-400 font-medium text-center">⚠ Cette action est irréversible. Confirmer ?</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleReset}
                    disabled={toolLoading === "reset"}
                    className="flex-1 text-xs bg-red-500 text-white hover:bg-red-600"
                  >
                    {toolLoading === "reset" ? "En cours…" : "Oui, tout supprimer"}
                  </Button>
                  <Button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 text-xs"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Give Wiz */}
          <Card className="p-4 space-y-3 border border-[var(--color-accent)]/20">
            <div className="flex items-start gap-3">
              <Zap className="size-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-accent)]">Donner des Wiz à tous</h3>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Crédite tous les joueurs non-bannis du montant choisi.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                <label className="text-xs text-[var(--color-muted)] shrink-0">Montant</label>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  value={giveWizAmount}
                  onChange={(e) => setGiveWizAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-sm text-center text-[var(--color-cream)] outline-none focus:border-[var(--color-accent)]/60"
                />
                <span className="text-xs text-[var(--color-muted)] shrink-0">Wiz</span>
              </div>
              <Button
                onClick={handleGiveWiz}
                disabled={toolLoading === "giveWiz"}
                className="text-xs shrink-0"
              >
                <Zap className="size-3.5 mr-1" />
                {toolLoading === "giveWiz" ? "En cours…" : "Distribuer"}
              </Button>
            </div>
          </Card>

          {/* Demo */}
          <Card className="p-4 space-y-3 border border-[var(--color-accent)]/20">
            <div className="flex items-start gap-3">
              <Sparkles className="size-5 text-[var(--color-accent)] shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-accent)]">Injecter les données de démo</h3>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Réinitialise puis injecte un tournoi complet : 3 poules, 10 équipes,
                  12 matchs de poule terminés, 5 matchs de bracket à venir,
                  5 joueurs démo (alice/bob/charlie/diana/eve @demo.com · mot de passe : Demo1234!).
                </p>
              </div>
            </div>
            {!confirmDemo ? (
              <Button
                onClick={() => setConfirmDemo(true)}
                className="w-full text-xs"
              >
                <Sparkles className="size-3.5 mr-1" /> Injecter la démo
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[var(--color-accent)] font-medium text-center">Les données actuelles seront remplacées. Confirmer ?</p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSeedDemo}
                    disabled={toolLoading === "demo"}
                    className="flex-1 text-xs"
                  >
                    {toolLoading === "demo" ? "Injection…" : "Oui, injecter"}
                  </Button>
                  <Button
                    onClick={() => setConfirmDemo(false)}
                    className="flex-1 text-xs bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:bg-[var(--color-surface-1)]"
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

function StatusRow({
  label,
  ok,
  text,
  invert = false,
}: {
  label: string;
  ok: boolean;
  text: string;
  invert?: boolean;
}) {
  const isGood = invert ? !ok : ok;
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={isGood ? "text-green-400 font-semibold" : "text-yellow-400 font-semibold"}>
        {text}
      </span>
    </div>
  );
}
