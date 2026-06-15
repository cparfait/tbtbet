/**
 * Pré-télécharge les drapeaux (SVG flagcdn) dans public/flags/ pour les servir
 * en local — zéro requête réseau vers flagcdn au runtime, et fonctionnement
 * hors-ligne. À lancer une fois, puis committer le dossier public/flags/ :
 *
 *   npm run flags
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FLAG_CODES } from "../lib/flags";

const OUT = join(process.cwd(), "public", "flags");

async function main() {
  await mkdir(OUT, { recursive: true });
  let ok = 0;
  let fail = 0;

  for (const code of FLAG_CODES) {
    try {
      const res = await fetch(`https://flagcdn.com/${code}.svg`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await writeFile(join(OUT, `${code}.svg`), await res.text());
      console.log(`✓ ${code}`);
      ok++;
    } catch (e) {
      console.warn(`✗ ${code} — ${e instanceof Error ? e.message : e}`);
      fail++;
    }
  }

  console.log(`\nTerminé : ${ok} drapeaux téléchargés, ${fail} échec(s) → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
