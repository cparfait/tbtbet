import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/auth-buttons";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const features = [
    {
      icon: "\u{1F3B2}",
      title: "Parie sur chaque match",
      description:
        "Victoire A, Victoire B ou \u00c9galit\u00e9\u2014place tes Wizz et grimpe au classement.",
    },
    {
      icon: "\u{1F0CF}",
      title: "Joue ton Joker \u00D72 strat\u00e9gique",
      description:
        "Double tes gains : 2 jokers \u00e0 utiliser quand tu es s\u00fbr de toi.",
    },
    {
      icon: "\u{1F3C6}",
      title: "Domine le classement",
      description:
        "Qui sera le meilleur pronostiqueur du tournoi\u00a0?",
    },
  ];

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden">
      {/* ── Animated gradient background ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(234,179,8,0.15) 0%, transparent 60%)",
            "radial-gradient(ellipse 60% 40% at 20% 80%, rgba(234,179,8,0.06) 0%, transparent 50%)",
            "radial-gradient(ellipse 50% 50% at 80% 60%, rgba(234,179,8,0.04) 0%, transparent 50%)",
            "var(--color-bg)",
          ].join(","),
        }}
      />

      {/* ── CSS-only particle dots ── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        <div className="landing-particles">
          {Array.from({ length: 20 }).map((_, i) => (
            <span
              key={i}
              className="landing-dot"
              style={{
                left: `${5 + ((i * 37) % 90)}%`,
                top: `${5 + ((i * 53) % 90)}%`,
                animationDelay: `${(i * 0.7) % 4}s`,
                animationDuration: `${3 + (i % 3)}s`,
                width: `${2 + (i % 3)}px`,
                height: `${2 + (i % 3)}px`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Decorative line at top ── */}
      <div
        aria-hidden="true"
        className="absolute left-0 right-0 top-0 z-10 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--color-accent) 30%, var(--color-accent-bright) 50%, var(--color-accent) 70%, transparent 100%)",
          opacity: 0.4,
        }}
      />

      {/* ── Content ── */}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 pt-8 pb-6 text-center">
        {/* Babyfoot icon with float */}
        <div className="animate-float animate-stagger stagger-1 mb-5">
          <div
            className="
              flex size-16 items-center justify-center rounded-[1.5rem]
              text-3xl
              shadow-[0_0_40px_rgba(234,179,8,0.25)]
            "
            style={{
              background:
                "linear-gradient(135deg, rgba(234,179,8,0.15), rgba(234,179,8,0.05))",
              border: "1px solid rgba(234,179,8,0.2)",
            }}
          >
            {"\u26BD"}
          </div>
        </div>

        {/* Title */}
        <h1
          className="
            animate-stagger stagger-2
            font-[family-name:var(--font-display)]
            text-5xl font-bold leading-none tracking-tight
            sm:text-6xl
          "
        >
          TBT
          <span className="text-gradient-gold">Bet</span>
        </h1>

        {/* Tagline */}
        <p
          className="
            animate-stagger stagger-3
            mt-3 max-w-xs text-balance text-sm leading-relaxed
            text-[var(--color-muted)]
          "
        >
          Tournoi de babyfoot Withings. Parie, trash-talk, deviens le champion
          des pronostiqueurs.
        </p>

        {/* Divider */}
        <div
          aria-hidden="true"
          className="animate-stagger stagger-3 my-5 h-px w-16"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-accent), transparent)",
            opacity: 0.4,
          }}
        />

        {/* Feature cards */}
        <div className="animate-stagger stagger-4 grid w-full gap-2.5">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`
                glass card-hover
                animate-stagger stagger-${4 + i}
                flex items-center gap-3.5 rounded-2xl px-4 py-3 text-left
              `}
            >
              <span
                className="
                  flex size-9 shrink-0 items-center justify-center
                  rounded-xl text-lg
                "
                style={{
                  background:
                    "linear-gradient(135deg, rgba(234,179,8,0.12), rgba(234,179,8,0.04))",
                  border: "1px solid rgba(234,179,8,0.15)",
                }}
              >
                {f.icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-cream)]">
                  {f.title}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted)]">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Decorative divider */}
        <div
          aria-hidden="true"
          className="animate-stagger stagger-7 my-5 h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-border-subtle), transparent)",
          }}
        />

        {/* Sign in section */}
        <div className="animate-stagger stagger-7 flex w-full flex-col items-center gap-4">
          <GoogleSignInButton className="w-full" />

          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/login"
              className="
                text-[var(--color-muted)] underline-offset-4
                transition-colors hover:text-[var(--color-cream)] hover:underline
              "
            >
              Connexion par email
            </Link>
            <span className="text-[var(--color-border-subtle)]">|</span>
            <Link
              href="/register"
              className="
                text-[var(--color-muted)] underline-offset-4
                transition-colors hover:text-[var(--color-cream)] hover:underline
              "
            >
              Cr&eacute;er un compte
            </Link>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="
          animate-stagger stagger-8
          relative z-10 pb-6 text-center text-xs tracking-wide
          text-[var(--color-muted)]
        "
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 h-px w-32"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--color-border-subtle), transparent)",
          }}
        />
        TBT Bet &middot; Tournoi Babyfoot Withings
      </footer>

      {/* ── Bottom decorative line ── */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 z-10 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, var(--color-accent) 30%, var(--color-gold) 50%, var(--color-accent) 70%, transparent 100%)",
          opacity: 0.25,
        }}
      />

    </main>
  );
}