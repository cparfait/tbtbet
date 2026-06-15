import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Flag } from "@/components/flag";
import { auth } from "@/lib/auth";
import { getUserPredictions, getUserStats } from "@/lib/data/queries";
import { computePoints } from "@/lib/scoring";

export const metadata = { title: "Barème · DaronsFC" };
export const dynamic = "force-dynamic";

const RULES = [
  {
    emoji: "🎯",
    title: "Score exact",
    points: "R × 2",
    desc: "Le score parfait, au but près — double les points du résultat.",
    example: "Bon résultat à 4 pts + score exact → 8 pts. Le jackpot sur un outsider !",
    color: "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.05]",
  },
  {
    emoji: "⚽",
    title: "Bon vainqueur + bonne différence de buts",
    points: "R + 1",
    desc: "Le bon gagnant avec le bon écart (hors nul).",
    example: "Tu pronostiques 3-1, le match finit 2-0. Même vainqueur, même écart de 2.",
    color: "border-[var(--color-pitch)]/25 bg-[var(--color-pitch)]/[0.04]",
  },
  {
    emoji: "✅",
    title: "Bon sens du résultat",
    points: "R",
    desc: "Le bon vainqueur, ou le bon nul — mais pas le bon score.",
    example: "Tu pronostiques 1-0, le match finit 3-0. Bon vainqueur, mauvais score.",
    color: "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]",
  },
  {
    emoji: "❌",
    title: "Mauvais pronostic",
    points: "0 pt",
    desc: "Ni le bon vainqueur, ni le bon nul.",
    example: "Tu pronostiques 1-0, le match finit 0-2.",
    color: "border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]",
  },
];

export default async function ScoringPage() {
  const session = await auth();
  const userId = session?.user?.id;

  // Pronostics terminés ayant rapporté des points, du plus rentable au plus
  // récent — pour montrer concrètement d'où viennent les points du joueur.
  const [predictions, stats] = userId
    ? await Promise.all([getUserPredictions(userId, 200), getUserStats(userId)])
    : [[], null];
  const scored = predictions
    .map((pred) => {
      if (!pred.match.result) return null;
      const { points } = computePoints(
        { homeScore: pred.homeScore, awayScore: pred.awayScore },
        pred.match.result,
        pred.joker,
        pred.match.odds
      );
      return { pred, points };
    })
    .filter((x): x is { pred: (typeof predictions)[number]; points: number } => x !== null && x.points > 0)
    .sort((a, b) => b.points - a.points);

  // Total autoritatif (table Score) = le chiffre cliqué sur le dashboard.
  const totalPoints = stats?.points ?? 0;

  return (
    <>
      <Link
        href="/profile"
        className="mb-5 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm text-[var(--color-muted)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-cream)]"
      >
        <ArrowLeft className="size-4" />
        <span>Profil</span>
      </Link>

      <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-extrabold">
        Comment ça marche ?
      </h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Le système de points et les jokers, en détail.
      </p>

      {/* ── Mes points match par match ── */}
      <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold">
        <span className="text-base">📊</span>
        Mes points
        {scored.length > 0 && (
          <span className="ml-auto font-[family-name:var(--font-display)] text-base font-bold text-[var(--color-gold)]">
            {totalPoints} pts
          </span>
        )}
      </h2>

      <div className="mb-6 flex flex-col gap-2">
        {scored.length === 0 ? (
          <Card className="glass p-6 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              Aucun match ne t&apos;a encore rapporté de points. Place tes pronos
              et reviens après les matchs ! ⚽
            </p>
          </Card>
        ) : (
          scored.map(({ pred, points }) => {
            const match = pred.match;
            const result = match.result!;
            const isExact =
              pred.homeScore === result.homeScore &&
              pred.awayScore === result.awayScore;
            return (
              <Card
                key={pred.matchId}
                className="glass flex items-center gap-3 p-3"
              >
                {/* Équipes + drapeaux */}
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <Flag code={match.homeFlag} className="h-4 w-6" />
                  <span className="truncate text-sm font-medium">
                    {match.homeTeam}
                  </span>
                  <span className="shrink-0 font-[family-name:var(--font-mono)] text-xs text-[var(--color-muted)]">
                    {result.homeScore}-{result.awayScore}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {match.awayTeam}
                  </span>
                  <Flag code={match.awayFlag} className="h-4 w-6" />
                </div>

                {/* Ton prono */}
                <div className="flex shrink-0 items-center gap-1">
                  <span
                    className={`font-[family-name:var(--font-display)] text-sm font-bold ${
                      isExact
                        ? "text-[var(--color-pitch-bright)]"
                        : "text-[var(--color-cream)]"
                    }`}
                  >
                    {pred.homeScore}-{pred.awayScore}
                  </span>
                  {pred.joker && (
                    <span className="text-sm" title="Joker activé">
                      🃏
                    </span>
                  )}
                </div>

                {/* Points gagnés */}
                <span className="shrink-0 rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-gold)]">
                  +{points} pts
                </span>
              </Card>
            );
          })
        )}
      </div>

      {/* ── Barème ── */}
      <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold">
        <span className="text-base">🏆</span>
        Calcul des points
      </h2>

      {/* ── R : les points du résultat suivent la cote ── */}
      <Card className="glass mb-4 border-[var(--color-pitch)]/25 bg-[var(--color-pitch)]/[0.04] p-4">
        <p className="text-sm leading-relaxed text-[var(--color-cream)]">
          <strong className="text-[var(--color-pitch-bright)]">R = les points d&apos;un bon résultat.</strong>{" "}
          Ils suivent la difficulté du match :{" "}
          <strong className="text-[var(--color-cream)]">de 1 pt</strong> pour un
          grand favori à <strong className="text-[var(--color-cream)]">6 pts</strong>{" "}
          pour un gros exploit. Plus l&apos;issue est improbable, plus elle
          rapporte — l&apos;audace paie. Les points en jeu sont affichés sur
          chaque match avant le coup d&apos;envoi.
        </p>
      </Card>

      <div className="mb-6 flex flex-col gap-3">
        {RULES.map((rule) => (
          <Card key={rule.title} className={`p-4 ${rule.color}`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{rule.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-[var(--color-cream)]">
                    {rule.title}
                  </h3>
                  <span className="shrink-0 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-gold)]">
                    {rule.points}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-[var(--color-muted)]">
                  {rule.desc}
                </p>
                <p className="mt-1.5 rounded-lg bg-[var(--color-surface)] px-2.5 py-1.5 text-xs italic text-[var(--color-muted)]">
                  {rule.example}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Note sur les nuls ── */}
      <Card className="glass mb-6 p-4">
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          <strong className="text-[var(--color-cream)]">Note sur les nuls :</strong>{" "}
          un match nul a toujours une différence de buts nulle. Le bonus «&nbsp;bonne
          différence&nbsp;» (R + 1) ne s&apos;applique donc pas aux nuls — un nul bien
          vu mais au mauvais score rapporte R (et R × 2 si le score est exact).
        </p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-muted)]">
          Et si les cotes d&apos;un match ne sont pas disponibles, on retombe sur
          le barème classique : 3 / 2 / 1 pt.
        </p>
      </Card>

      {/* ── Jokers ── */}
      <h2 className="mb-3 flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-bold">
        <span className="text-base">🃏</span>
        Les jokers
      </h2>

      <Card className="glass mb-3 p-4">
        <p className="mb-3 text-sm leading-relaxed text-[var(--color-cream)]">
          Un joker <strong>doublera les points</strong> d&apos;un pronostic (×2).
          À utiliser stratégiquement sur tes pronostics les plus confiants !
        </p>

        <div className="flex flex-col gap-3">
          {/* Poules */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-[var(--color-cream)]">
                Phase de poules
              </span>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-gold)]">
                4 jokers
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Utilisables sur n&apos;importe quel match de la phase de groupes.
            </p>
          </div>

          {/* Phase finale */}
          <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-2)] p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold text-[var(--color-cream)]">
                Phase finale
              </span>
              <span className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--color-gold)]">
                2 jokers
              </span>
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Huitièmes, quarts, demies, finale et match pour la 3ᵉ place.
            </p>
          </div>
        </div>
      </Card>

      {/* Exemple concret */}
      <Card className="border-[var(--color-gold)]/25 bg-[var(--color-gold)]/[0.04] p-4">
        <h3 className="mb-2 font-semibold text-[var(--color-gold)]">
          💡 Exemple
        </h3>
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          Tu oses la victoire d&apos;un outsider (résultat à{" "}
          <strong className="text-[var(--color-cream)]">5 pts</strong>) et tu trouves
          le score exact <strong className="text-[var(--color-cream)]">2-1</strong>{" "}
          avec un joker : <strong className="text-[var(--color-gold)]">5 × 2 (exact) × 2 (joker) = 20 pts</strong> 🎉
        </p>
      </Card>
    </>
  );
}
