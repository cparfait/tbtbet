import { TrendingUp, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { countryCode } from "@/lib/flags";
import { formatKickoff } from "@/lib/utils";
import {
  fetchLiveOdds,
  impliedProbabilities,
  resultPoints,
  SAMPLE_ODDS,
  ODDS_SPORT,
  type OddsMatch,
} from "@/lib/odds";

export const metadata = { title: "Test cotes · DaronsFC" };
export const dynamic = "force-dynamic";

/** Valeur de points (doré, comme les points partout dans l'app). */
function PointsValue({ points }: { points: number }) {
  return (
    <span className="font-[family-name:var(--font-display)] text-lg font-bold tabular-nums text-[var(--color-gold)]">
      {points}
      <span className="ml-0.5 text-[10px] font-semibold text-[var(--color-muted)]">
        pt{points > 1 ? "s" : ""}
      </span>
    </span>
  );
}

/** Colonne d'une issue : drapeau (ou « VS ») en haut, libellé, points dessous. */
function Outcome({
  flag,
  label,
  points,
}: {
  flag?: string;
  label: string;
  points: number;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
      {flag !== undefined ? (
        <Flag code={flag} className="h-7 w-10" />
      ) : (
        <span className="flex h-7 items-center font-[family-name:var(--font-display)] text-xs font-bold text-[var(--color-muted)]">
          VS
        </span>
      )}
      <span className="line-clamp-1 max-w-full text-sm font-bold">{label}</span>
      <PointsValue points={points} />
    </div>
  );
}

/** Carte d'un match dans le style de la page Matchs, points sous chaque issue. */
function OddsRow({ m }: { m: OddsMatch }) {
  const p = impliedProbabilities(m);

  return (
    <Card className="p-4">
      <div className="mb-3 text-xs text-[var(--color-muted)]">
        <span className="font-[family-name:var(--font-mono)]">
          {formatKickoff(m.commenceTime)}
        </span>
      </div>

      <div className="flex items-start justify-between gap-2">
        <Outcome
          flag={countryCode(m.home)}
          label={m.home}
          points={resultPoints(p.home)}
        />
        <Outcome label="Nul" points={resultPoints(p.draw)} />
        <Outcome
          flag={countryCode(m.away)}
          label={m.away}
          points={resultPoints(p.away)}
        />
      </div>
    </Card>
  );
}

export default async function OddsTestPage() {
  let matches: OddsMatch[] = SAMPLE_ODDS;
  let live = false;
  let error: string | null = null;

  try {
    const fetched = await fetchLiveOdds();
    if (fetched && fetched.length > 0) {
      matches = fetched;
      live = true;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Erreur de récupération des cotes.";
  }

  return (
    <>
      <PageHeader
        title="Test cotes"
        subtitle="Points d'une victoire selon la difficulté du match"
        action={
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider " +
              (live
                ? "bg-[var(--color-pitch)]/15 text-[var(--color-pitch-bright)]"
                : "bg-[var(--color-gold)]/15 text-[var(--color-gold)]")
            }
          >
            <TrendingUp className="size-3" />
            {live ? "En direct" : "Exemple"}
          </span>
        }
      />

      {!live && (
        <Card className="glass mb-5 flex items-start gap-3 border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.05] p-3.5">
          <Info className="mt-0.5 size-4 shrink-0 text-[var(--color-gold)]" />
          <div className="text-xs leading-relaxed text-[var(--color-muted)]">
            <p className="font-semibold text-[var(--color-cream)]">
              Données d&apos;exemple
            </p>
            <p className="mt-0.5">
              Ajoute une clé <code className="text-[var(--color-cream)]">ODDS_API_KEY</code>{" "}
              (gratuite sur the-odds-api.com) pour utiliser les vraies cotes du
              sport <code className="text-[var(--color-cream)]">{ODDS_SPORT}</code>.
              Les cotes ne sont jamais affichées — elles servent juste à calculer
              les points.
            </p>
            {error && (
              <p className="mt-1.5 text-red-400">Dernière erreur : {error}</p>
            )}
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {matches.map((m, i) => (
          <OddsRow key={`${m.home}-${m.away}-${i}`} m={m} />
        ))}
      </div>
    </>
  );
}
