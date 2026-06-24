import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="text-6xl">🤫</span>
      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold">
          Promis, je ne le dirai à personne
        </h1>
        <p className="text-sm text-[var(--color-muted)]">
          que tu es passé par ici…
        </p>
        <p className="text-base font-semibold text-[var(--color-accent)]">
          mais file.
        </p>
      </div>
      <Link href="/">
        <Button>Filer</Button>
      </Link>
    </main>
  );
}
