"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Swords, Trophy, Plus, Trash2, CheckCircle2, Calendar, RefreshCw, ImageIcon, Check, X, Upload } from "lucide-react";

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
  teamB: Team;
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

type Tab = "teams" | "pools" | "matches" | "results" | "users";

const TABS: { key: Tab; label: string; icon: typeof Users }[] = [
  { key: "teams", label: "Équipes", icon: Swords },
  { key: "pools", label: "Poules", icon: Trophy },
  { key: "matches", label: "Matchs", icon: Calendar },
  { key: "results", label: "Résultats", icon: CheckCircle2 },
  { key: "users", label: "Joueurs", icon: Users },
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
  // Team logo edit
  const [editLogoTeamId, setEditLogoTeamId] = useState<string | null>(null);
  const [editLogoUrl, setEditLogoUrl] = useState("");

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
      setEditLogoTeamId(null);
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
        setEditLogoUrl(url);
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
    try {
      await apiCall("/api/admin/matches", "PATCH", {
        id: resultMatchId,
        scoreA: resultScoreA,
        scoreB: resultScoreB,
        result: resultWinner,
      });
      setResultMatchId(""); setResultScoreA(0); setResultScoreB(0);
      ok("Résultat enregistré ! Paris réglés.");
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

  const pendingMatches = matches.filter((m) => m.status === "SCHEDULED" || m.status === "LIVE");
  const poolMatches = matches.filter((m) => m.phase === "POOL");
  const bracketMatches = matches.filter((m) => m.phase !== "POOL");

  const selectedMatchForResult = pendingMatches.find((m) => m.id === resultMatchId);
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
      <div className="flex gap-1 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
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

          {/* Liste équipes */}
          <div className="space-y-1">
            {teams.map((team) => (
              <Card key={team.id} className="p-3 space-y-2">
                <div className="flex items-start gap-3">
                  {/* Logo cliquable pour éditer */}
                  <button
                    onClick={() => {
                      if (editLogoTeamId === team.id) {
                        setEditLogoTeamId(null);
                      } else {
                        setEditLogoTeamId(team.id);
                        setEditLogoUrl(team.logoUrl ?? "");
                      }
                    }}
                    className="shrink-0 relative group size-12 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] overflow-hidden flex items-center justify-center"
                    title="Modifier le logo"
                  >
                    {team.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.logoUrl} alt={team.name} className="size-full object-contain" />
                    ) : (
                      <ImageIcon className="size-4 text-[var(--color-muted)]" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] text-white font-medium">URL</span>
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

                {/* Éditeur de logo inline */}
                {editLogoTeamId === team.id && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-[var(--color-border-subtle)]">
                    <p className="text-[10px] text-[var(--color-muted)]">URL du logo</p>
                    <div className="flex gap-2 items-start">
                      {/* Aperçu live */}
                      <div className="shrink-0 size-14 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] overflow-hidden flex items-center justify-center">
                        {editLogoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={editLogoUrl}
                            alt="aperçu"
                            className="size-full object-contain"
                            onError={(e) => { e.currentTarget.style.opacity = "0.15"; }}
                          />
                        ) : (
                          <ImageIcon className="size-4 text-[var(--color-muted)]" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex gap-1.5">
                          <input
                            type="url"
                            placeholder="https://..."
                            value={editLogoUrl}
                            onChange={(e) => setEditLogoUrl(e.target.value)}
                            className="flex-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-xs"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => triggerUpload(team.id)}
                            disabled={uploading}
                            className="shrink-0 flex items-center gap-1 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2.5 text-[var(--color-muted)] hover:text-[var(--color-cream)] disabled:opacity-40"
                            title="Uploader JPG/PNG"
                          >
                            {uploading && uploadTarget === team.id
                              ? <span className="text-[9px]">…</span>
                              : <Upload className="size-3.5" />}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveLogo(team.id, editLogoUrl)}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-[var(--color-accent)]/10 px-3 py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20"
                          >
                            <Check className="size-3" /> Sauvegarder
                          </button>
                          <button
                            onClick={() => setEditLogoTeamId(null)}
                            className="flex items-center justify-center rounded-lg border border-[var(--color-border-subtle)] px-3 py-1.5 text-[var(--color-muted)] hover:text-[var(--color-cream)]"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
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
                        {team.logoUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={team.logoUrl} alt={team.name} className="size-5 object-contain rounded" />
                        )}
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
                          {match.teamA.name} vs {match.teamB.name}
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
                      <div className="flex gap-1 shrink-0">
                        {match.status !== "FINISHED" && (
                          <button
                            onClick={() => {
                              setEditDateMatchId(match.id);
                              setEditDateValue(match.scheduledAt
                                ? new Date(match.scheduledAt).toISOString().slice(0, 16)
                                : "");
                            }}
                            className="text-[10px] px-2 py-1 rounded bg-[var(--color-surface-2)] text-[var(--color-muted)] hover:text-[var(--color-cream)]"
                          >
                            <Calendar className="size-3.5" />
                          </button>
                        )}
                        <button onClick={() => handleDeleteMatch(match.id)} className="text-red-400 hover:text-red-300">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    {editDateMatchId === match.id && (
                      <div className="mt-2 flex gap-2">
                        <input
                          type="datetime-local"
                          value={editDateValue}
                          onChange={(e) => setEditDateValue(e.target.value)}
                          className="flex-1 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-xs"
                        />
                        <button onClick={() => handleSaveMatchDate(match.id)}
                          className="text-[10px] px-2 py-1 rounded bg-[var(--color-accent)]/10 text-[var(--color-accent)]">OK</button>
                        <button onClick={() => setEditDateMatchId(null)}
                          className="text-[10px] px-2 py-1 rounded text-[var(--color-muted)]">×</button>
                      </div>
                    )}
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
                        {match.teamA.name} vs {match.teamB.name}
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
            <select
              value={resultMatchId}
              onChange={(e) => {
                const newId = e.target.value;
                setResultMatchId(newId);
                const newMatch = pendingMatches.find((m) => m.id === newId);
                if (newMatch && newMatch.phase !== "POOL" && resultWinner === "DRAW") {
                  setResultWinner("TEAM_A");
                }
              }}
              className="w-full rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-3 py-2 text-sm">
              <option value="">-- Choisir un match --</option>
              {pendingMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label || "Match"} — {m.teamA.name} vs {m.teamB.name}
                </option>
              ))}
            </select>

            {resultMatchId && (() => {
              const m = pendingMatches.find((x) => x.id === resultMatchId);
              return m ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium flex-1 text-center">{m.teamA.name}</span>
                    <input type="number" min={0} value={resultScoreA} onChange={(e) => setResultScoreA(Number(e.target.value))}
                      className="w-14 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-center text-sm" />
                    <span className="text-sm text-[var(--color-muted)]">-</span>
                    <input type="number" min={0} value={resultScoreB} onChange={(e) => setResultScoreB(Number(e.target.value))}
                      className="w-14 rounded border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] px-2 py-1 text-center text-sm" />
                    <span className="text-xs font-medium flex-1 text-center">{m.teamB.name}</span>
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
                        {r === "TEAM_A" ? `✓ ${m.teamA.name}` : r === "TEAM_B" ? `✓ ${m.teamB.name}` : "Égalité"}
                      </button>
                    ))}
                  </div>
                </>
              ) : null;
            })()}

            <Button onClick={handleSubmitResult} disabled={!resultMatchId} className="w-full text-xs">
              <CheckCircle2 className="size-3.5 mr-1" /> Enregistrer + Régler les paris
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
                  <p className="text-[10px] text-[var(--color-muted)]">{m.teamA.name} vs {m.teamB.name}</p>
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
                  <button
                    onClick={() => handleToggleBan(user.id, user.banned)}
                    className={cn(
                      "text-xs px-2 py-1 rounded",
                      user.banned ? "bg-green-400/10 text-green-400" : "bg-red-400/10 text-red-400"
                    )}
                  >
                    {user.banned ? "Débannir" : "Bannir"}
                  </button>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
