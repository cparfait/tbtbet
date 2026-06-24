"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn, dayKey, dayLabel, formatKickoffTime } from "@/lib/utils";
import { TeamLogo } from "@/components/team-logo";
import { Users, Swords, Trophy, Plus, Trash2, CheckCircle2, Calendar, RefreshCw, ImageIcon, Upload, Wrench, RotateCcw, Sparkles } from "lucide-react";

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
}

interface AdminConsoleProps {
  users: AdminUser[];
  teams: Team[];
  pools: Pool[];
  matches: Match[];
  currentUserId: string;
}

type Tab = "teams" | "pools" | "matches" | "results" | "users" | "tools";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "teams", label: "Équipes", icon: Swords },
  { key: "pools", label: "Poules", icon: Trophy },
  { key: "matches", label: "Matchs", icon: Calendar },
  { key: "results", label: "Résultats", icon: CheckCircle2 },
  { key: "users", label: "Joueurs", icon: Users },
  { key: "tools", label: "Outils", icon: Wrench },
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

  async function handleToggleRole(userId: string, role: string) {
    const newRole = role === "ADMIN" ? "USER" : "ADMIN";
    try { await apiCall("/api/admin/users", "PATCH", { id: userId, role: newRole }); ok(newRole === "ADMIN" ? "Rôle admin accordé." : "Rôle admin retiré."); }
    catch (e) { err(e); }
  }

  // ── Tools ──
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [toolLoading, setToolLoading] = useState<"reset" | "demo" | null>(null);

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

  return (
    <div className="space-y-4">
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
                      <p className="text-sm font-medium truncate">{team.name}</p>
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
                          <>
                            <input
                              type="datetime-local"
                              className="w-[130px] rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-1.5 py-1 text-[10px] text-[var(--color-cream)] [color-scheme:dark]"
                              value={match.scheduledAt
                                ? new Date(match.scheduledAt).toISOString().slice(0, 16)
                                : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                apiCall("/api/admin/matches", "PATCH", {
                                  id: match.id,
                                  scheduledAt: val || null,
                                }).then(() => ok("Date mise à jour.")).catch(err);
                              }}
                            />
                          </>
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
                  <Card key={match.id} className="flex items-center justify-between p-3">
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
                    <button onClick={() => handleDeleteMatch(match.id)} className="text-red-400 hover:text-red-300 shrink-0">
                      <Trash2 className="size-4" />
                    </button>
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
                    return (
                      <button
                        key={m.id}
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
                          "w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors flex items-center gap-1.5",
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
                        <span className="flex-1 font-medium truncate">{m.teamA.name} vs {m.teamB?.name ?? "À déterminer"}</span>
                        {isDone ? (
                          <span className="shrink-0 text-[10px] text-green-400 font-bold">✓ {m.scoreA}-{m.scoreB}</span>
                        ) : (
                          <span className="shrink-0 text-[9px] text-[var(--color-muted)]">
                            {formatKickoffTime(m.scheduledAt!)}
                          </span>
                        )}
                      </button>
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
                      return (
                        <button
                          key={m.id}
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
                            "w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors flex items-center gap-1.5",
                            isSelected
                              ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                              : isDone
                              ? "text-[var(--color-muted)] hover:bg-[var(--color-surface-1)]"
                              : "text-[var(--color-cream)] hover:bg-[var(--color-surface-1)]"
                          )}
                        >
                          <span className="flex-1 font-medium truncate">{m.teamA.name} vs {m.teamB?.name ?? "À déterminer"}</span>
                          {isDone && (
                            <span className="shrink-0 text-[10px] text-green-400 font-bold">✓ {m.scoreA}-{m.scoreB}</span>
                          )}
                        </button>
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
                    return (
                      <button
                        key={m.id}
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
                          "w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors flex items-center gap-1.5",
                          isSelected
                            ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]"
                            : isDone
                            ? "text-[var(--color-muted)] hover:bg-[var(--color-surface-1)]"
                            : "text-[var(--color-cream)] hover:bg-[var(--color-surface-1)]"
                        )}
                      >
                        <span className="flex-1 font-medium truncate">{m.teamA.name} vs {m.teamB?.name ?? "À déterminer"}</span>
                        {isDone ? (
                          <span className="shrink-0 text-[10px] text-green-400 font-bold">✓ {m.scoreA}-{m.scoreB}</span>
                        ) : m.label && !m.label.includes(" vs ") ? (
                          <span className="shrink-0 text-[9px] text-[var(--color-muted)]">{m.label}</span>
                        ) : null}
                      </button>
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
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

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
                  Le compte admin est conservé (solde remis à 100 Wizz).
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
