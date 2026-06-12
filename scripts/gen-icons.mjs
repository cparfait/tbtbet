// Génère le jeu d'icônes (PWA + favicon + apple-touch) à partir d'une image source.
//
//   node scripts/gen-icons.mjs [chemin-source]
//
// Source par défaut : public/icons/source.png
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const src = process.argv[2] ?? "public/icons/source.png";
const ICONS_DIR = "public/icons";
const PUBLIC_DIR = "public";

// Fond pour l'icône maskable (zone de sécurité ~80 %). Blanc = cadre du logo.
const MASKABLE_BG = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });
  const base = sharp(src);
  const meta = await base.metadata();
  console.log(`Source : ${src} (${meta.width}x${meta.height})`);

  // Icônes pleines (192, 512) — fond transparent, image entière.
  for (const size of [192, 512]) {
    await sharp(src)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(ICONS_DIR, `icon-${size}.png`));
    console.log(`✓ icon-${size}.png`);
  }

  // Apple touch icon (180) — fond blanc (iOS n'aime pas la transparence).
  await sharp(src)
    .resize(180, 180, { fit: "contain", background: MASKABLE_BG })
    .flatten({ background: MASKABLE_BG })
    .png()
    .toFile(path.join(PUBLIC_DIR, "apple-touch-icon.png"));
  console.log("✓ apple-touch-icon.png");

  // Maskable 512 — logo à ~80 % centré sur fond plein (zone de sécurité).
  const inner = Math.round(512 * 0.8);
  const resized = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: MASKABLE_BG },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png()
    .toFile(path.join(ICONS_DIR, "icon-maskable-512.png"));
  console.log("✓ icon-maskable-512.png");

  console.log("\nTerminé. Pense à vider le cache PWA pour voir la nouvelle icône.");
}

main().catch((e) => {
  console.error("Échec génération icônes :", e.message);
  process.exit(1);
});
