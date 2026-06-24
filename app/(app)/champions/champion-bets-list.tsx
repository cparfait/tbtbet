"use client";

import { useState } from "react";
import { ChevronDown, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TeamLogo } from "@/components/team-logo";
import { UserAvatar } from "@/components/user-avatar";

type Player = { id: string; name: string | null; avatarUrl: string | null };
type TeamStat = {
  id: string;
  name: string;
  logoUrl: string | null;
  players: Player[];
  count: number;
};

export function ChampionBetsList({ teams }: { teams: TeamStat[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
        <Users className="size-4 text-[var(--color-muted)]" />
        <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider font-semibold">
          Les favoris de la communauté
        </p>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {teams.map((team) => (
          <div key={team.id}>
            <button
              onClick={() => team.count > 0 && toggle(team.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--color-accent)]/5 transition-colors disabled:opacity-40 disabled:cursor-default"
              disabled={team.count === 0}
            >
              <TeamLogo
                url={team.logoUrl}
                name={team.name}
                className="size-8 rounded-md shrink-0"
              />
              <span className="flex-1 font-semibold text-sm">{team.name}</span>
              <span className="text-sm text-[var(--color-muted)] tabular-nums">
                {team.count === 0
                  ? "—"
                  : `${team.count} joueur${team.count > 1 ? "s" : ""}`}
              </span>
              {team.count > 0 && (
                <ChevronDown
                  className={`size-4 text-[var(--color-muted)] transition-transform duration-200 ${
                    openId === team.id ? "rotate-180" : ""
                  }`}
                />
              )}
            </button>

            {openId === team.id && (
              <div className="px-4 pb-3 pt-1 space-y-2 bg-[var(--color-accent)]/5">
                {team.players.map((player) => (
                  <div key={player.id} className="flex items-center gap-2">
                    <UserAvatar
                      src={player.avatarUrl}
                      name={player.name}
                      className="size-7"
                    />
                    <span className="text-sm">{player.name ?? "Joueur"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
