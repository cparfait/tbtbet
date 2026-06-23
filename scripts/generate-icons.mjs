/**
 * Génère les icônes TBT Bet (favicon, PWA icons, apple-touch-icon).
 * Thème : table de babyfoot vue du dessus, palette noir/jaune.
 * Exécuter avec : node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── SVG source ──────────────────────────────────────────────────────────────
// Icône babyfoot : joueur (silhouette) sur sa barre + "TBT BET"
// Palette : fond noir, joueur jaune, barre blanche, texte blanc/jaune
function makeSvg(size) {
  const r = Math.round(size * 0.18);
  const cx = size / 2;

  // Proportions relatives à 512px → scalées
  const s = size / 512;
  const scale = (v) => Math.round(v * s);

  // Barre horizontale (la tige du babyfoot)
  const rodY = scale(200);
  const rodH = scale(22);

  // Corps du joueur (rectangle arrondi, centré sur la barre)
  const bodyW = scale(80);
  const bodyH = scale(130);
  const bodyX = cx - bodyW / 2;
  const bodyY = rodY - scale(60);

  // Tête
  const headR = scale(38);
  const headCy = bodyY - headR + scale(8);

  // Jambe qui tape (kick) — pointe vers le bas-droite
  const legTopX = cx + scale(12);
  const legTopY = bodyY + bodyH;
  const legBotX = cx + scale(60);
  const legBotY = legTopY + scale(55);
  const legW = scale(18);

  // Ballon (football 5-branches en bas, légèrement décalé)
  const ballCx = cx - scale(70);
  const ballCy = rodY + scale(100);
  const ballR = scale(36);

  // Barre jaune basse
  const barH = scale(70);
  const barY = size - barH;

  // Texte
  const fontMain = scale(88);  // "TBT"
  const fontSub  = scale(46);  // "BET"

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <clipPath id="clip"><rect width="${size}" height="${size}" rx="${r}" ry="${r}"/></clipPath>
  </defs>

  <!-- Fond noir -->
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#111111"/>

  <!-- Bande jaune basse -->
  <rect x="0" y="${barY}" width="${size}" height="${barH}" fill="#F5C400" clip-path="url(#clip)"/>

  <!-- Barre de babyfoot (tige blanche) -->
  <rect x="0" y="${rodY}" width="${size}" height="${rodH}" rx="${Math.round(rodH / 2)}" fill="#FFFFFF" opacity="0.92" clip-path="url(#clip)"/>

  <!-- Corps du joueur (jaune) -->
  <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${scale(14)}" fill="#F5C400"/>

  <!-- Tête (blanche) -->
  <circle cx="${cx}" cy="${headCy}" r="${headR}" fill="#FFFFFF"/>
  <!-- Traits du visage (minimaliste) -->
  <circle cx="${cx - scale(11)}" cy="${headCy - scale(5)}" r="${scale(6)}" fill="#111111"/>
  <circle cx="${cx + scale(11)}" cy="${headCy - scale(5)}" r="${scale(6)}" fill="#111111"/>

  <!-- Jambe en coup (jaune, rotée) -->
  <line x1="${legTopX}" y1="${legTopY}" x2="${legBotX}" y2="${legBotY}"
        stroke="#F5C400" stroke-width="${legW}" stroke-linecap="round"/>

  <!-- Ballon de foot (cercle + lignes pentagonales simplifiées) -->
  <circle cx="${ballCx}" cy="${ballCy}" r="${ballR}" fill="#FFFFFF" opacity="0.95"/>
  <circle cx="${ballCx}" cy="${ballCy}" r="${Math.round(ballR * 0.42)}" fill="#111111" opacity="0.7"/>
  <line x1="${ballCx}" y1="${ballCy - ballR + scale(6)}" x2="${ballCx}" y2="${ballCy + ballR - scale(6)}"
        stroke="#111111" stroke-width="${scale(3)}" opacity="0.4"/>
  <line x1="${ballCx - ballR + scale(6)}" y1="${ballCy}" x2="${ballCx + ballR - scale(6)}" y2="${ballCy}"
        stroke="#111111" stroke-width="${scale(3)}" opacity="0.4"/>

  <!-- "TBT" -->
  <text x="${cx + scale(30)}" y="${scale(440)}"
    font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontMain}"
    fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" letter-spacing="-2">TBT</text>

  <!-- "BET" en jaune (en dessous, dans la bande jaune) -->
  <text x="${cx + scale(30)}" y="${barY + Math.round(barH * 0.56)}"
    font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSub}"
    fill="#111111" text-anchor="middle" dominant-baseline="middle" letter-spacing="4">BET</text>
</svg>`;
}

// Variante maskable (safe zone 15%, même design mais sans clip)
function makeMaskableSvg(size) {
  const cx = size / 2;
  const s = size / 512;
  const scale = (v) => Math.round(v * s);

  const rodY = scale(200);
  const rodH = scale(22);
  const bodyW = scale(80);
  const bodyH = scale(130);
  const bodyX = cx - bodyW / 2;
  const bodyY = rodY - scale(60);
  const headR = scale(38);
  const headCy = bodyY - headR + scale(8);
  const legTopX = cx + scale(12);
  const legTopY = bodyY + bodyH;
  const legBotX = cx + scale(60);
  const legBotY = legTopY + scale(55);
  const legW = scale(18);
  const ballCx = cx - scale(70);
  const ballCy = rodY + scale(100);
  const ballR = scale(36);
  const barH = scale(70);
  const barY = size - barH;
  const fontMain = scale(88);
  const fontSub  = scale(46);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#111111"/>
  <rect x="0" y="${barY}" width="${size}" height="${barH}" fill="#F5C400"/>
  <rect x="0" y="${rodY}" width="${size}" height="${rodH}" rx="${Math.round(rodH / 2)}" fill="#FFFFFF" opacity="0.92"/>
  <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${scale(14)}" fill="#F5C400"/>
  <circle cx="${cx}" cy="${headCy}" r="${headR}" fill="#FFFFFF"/>
  <circle cx="${cx - scale(11)}" cy="${headCy - scale(5)}" r="${scale(6)}" fill="#111111"/>
  <circle cx="${cx + scale(11)}" cy="${headCy - scale(5)}" r="${scale(6)}" fill="#111111"/>
  <line x1="${legTopX}" y1="${legTopY}" x2="${legBotX}" y2="${legBotY}"
        stroke="#F5C400" stroke-width="${legW}" stroke-linecap="round"/>
  <circle cx="${ballCx}" cy="${ballCy}" r="${ballR}" fill="#FFFFFF" opacity="0.95"/>
  <circle cx="${ballCx}" cy="${ballCy}" r="${Math.round(ballR * 0.42)}" fill="#111111" opacity="0.7"/>
  <text x="${cx + scale(30)}" y="${scale(440)}"
    font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontMain}"
    fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" letter-spacing="-2">TBT</text>
  <text x="${cx + scale(30)}" y="${barY + Math.round(barH * 0.56)}"
    font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fontSub}"
    fill="#111111" text-anchor="middle" dominant-baseline="middle" letter-spacing="4">BET</text>
</svg>`;
}

async function svgToPng(svgStr, outPath, size) {
  const buf = Buffer.from(svgStr);
  await sharp(buf)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ ${outPath} (${size}×${size})`);
}

async function main() {
  mkdirSync(join(ROOT, "public/icons"), { recursive: true });

  // PWA icons
  await svgToPng(makeSvg(512), join(ROOT, "public/icons/icon-512.png"), 512);
  await svgToPng(makeSvg(192), join(ROOT, "public/icons/icon-192.png"), 192);
  await svgToPng(makeMaskableSvg(512), join(ROOT, "public/icons/icon-maskable-512.png"), 512);

  // Apple touch icon (180×180, pas de transparency)
  await svgToPng(makeSvg(180), join(ROOT, "public/apple-touch-icon.png"), 180);

  // logo.png (utilisé dans l'app si besoin)
  await svgToPng(makeSvg(256), join(ROOT, "public/logo.png"), 256);

  // Favicon ICO via SVG (les navigateurs modernes acceptent le SVG comme favicon)
  const faviconSvg = makeSvg(32);
  writeFileSync(join(ROOT, "public/favicon.svg"), faviconSvg);
  console.log(`✓ public/favicon.svg`);

  // favicon 32×32 PNG (fallback)
  await svgToPng(makeSvg(32), join(ROOT, "public/favicon-32.png"), 32);
  // favicon 16×16 PNG
  await svgToPng(makeSvg(16), join(ROOT, "public/favicon-16.png"), 16);

  console.log("\n✅ Toutes les icônes TBT Bet générées.");
}

main().catch(console.error);
