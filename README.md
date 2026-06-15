<div align="center">

# ⚽ DaronsFC

### Le jeu de pronos de la Coupe du Monde, entre darons (et fiers de l'être) 🏆

*Pronostique, mets ton joker, chambre tes potes dans le tchat, et grimpe au classement.*

![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-blue?logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)

</div>

---

## 🎯 C'est quoi ?

**DaronsFC** est une appli web (PWA installable) de pronostics pour la **Coupe du Monde 2026**, pensée pour une bande de potes. Chacun prédit le score des matchs, gagne des points selon sa lucidité, déclenche des **jokers** pour doubler la mise, débloque des **badges**, et défend son rang dans le **classement de son groupe** — le tout avec un **tchat** pour mettre l'ambiance.

Pas de données bidon : les matchs et scores viennent en direct de l'API **football-data.org**, synchronisés automatiquement.

## ✨ Les fonctionnalités

- 🔮 **Pronostics** — saisie du score au but près, modifiable jusqu'au coup d'envoi (verrouillé après, anti-triche).
- 🃏 **Jokers** — double les points d'un prono. Budget par phase : **4** en poules, **2** en phase finale.
- 🏆 **Classement live** — points acquis + points provisoires pendant les matchs en cours, avec flèches d'évolution ▲▼.
- 👥 **Groupes** — crée ta bande via un lien d'invitation, chacun son classement.
- 💬 **Tchat de groupe** — messages, réactions emoji, épinglage (admin), notifications push.
- 🤖 **Récaps automatiques** — après chaque match, un bandeau récap tombe dans le tchat : podium, meilleurs pronos, jokers gagnés/grillés, changement de leader.
- 🎖️ **Badges** — 10 hauts faits à débloquer (voir plus bas).
- 🇫🇷 **Thème tricolore** — l'interface passe en **bleu nuit / bleu-blanc-rouge** les jours de match des Bleus. Allez les Bleus ! 💙🤍❤️
- 📲 **Notifications push** — résultat tombé, tu t'es fait doubler, récap… directement sur ton téléphone.
- 📊 **Classements des poules** — le tableau officiel des groupes de la CdM.

## 🧮 Le barème (façon MPP, indexé sur les cotes)

Les points d'un **bon résultat** suivent la difficulté du match : **`R`** vaut de **1 pt** (grand favori) à **6 pts** (gros exploit) selon la cote 1X2 figée avant le coup d'envoi. Plus l'issue est improbable, plus elle rapporte — l'audace paie.

| Résultat | Points |
|---|:---:|
| 🎯 **Score exact** | **R × 2** |
| ⚽ Bon vainqueur **+** bonne différence de buts (hors nul) | **R + 1** |
| ✅ Bon sens du résultat (bon vainqueur ou bon nul) | **R** |
| ❌ Mauvais pronostic | **0 pt** |
| 🃏 Joker activé | **× 2** |

> 🤓 *Subtilité sur les nuls : un nul a toujours une différence de buts nulle, donc le bonus « bonne diff » ne s'applique pas aux nuls — un nul bien vu mais au mauvais score vaut R (R × 2 si exact).*
>
> *Cotes via [The Odds API](https://the-odds-api.com) (palier gratuit), capturées ~toutes les 6 h jusqu'au coup d'envoi puis figées (closing odds), identiques pour tous. Match sans cote → repli sur le barème classique 3 / 2 / 1.*

## 🎖️ Les badges

| Badge | Comment l'obtenir |
|---|---|
| 👣 Premier pas | Ton tout premier pronostic |
| 🔮 Nostradamus | 3 scores exacts consécutifs |
| 🔥 En feu | 5 bons résultats d'affilée |
| 💎 Le Perfectionniste | Un score exact avec le joker |
| 📅 L'Assidu | Tous les matchs d'une journée pronostiqués |
| 💀 Même pas mal | 0 pt sur une journée complète |
| 🎯 Sniper | 10 scores exacts au total |
| 🎖️ Cinquantenaire | 50 points au total |
| 💯 Centurion | 100 points au total |
| 👑 Le Daronissime | 1ʳᵉ place en fin de tournoi |

## 🛠️ Stack technique

- **[Next.js 15](https://nextjs.org/)** (App Router, React 19, Server Components)
- **[TypeScript](https://www.typescriptlang.org/)** strict
- **[Prisma 6](https://www.prisma.io/)** + **PostgreSQL**
- **[NextAuth v5](https://authjs.dev/)** — Google OAuth + email/mot de passe
- **[Tailwind CSS 4](https://tailwindcss.com/)** — design system maison, dark mode
- **[web-push](https://github.com/web-push-libs/web-push)** — notifications PWA (VAPID)
- **[football-data.org](https://www.football-data.org/)** — source des matchs & scores (palier gratuit)
- **[The Odds API](https://the-odds-api.com/)** — cotes 1X2 pour le barème « façon MPP » (palier gratuit)
- **[Vitest](https://vitest.dev/)** — tests unitaires du barème

## 🚀 Démarrage

```bash
# 1. Installer
npm install

# 2. Configurer l'environnement
cp .env.example .env.local   # puis remplis les variables (voir ci-dessous)

# 3. Préparer la base
npm run db:push              # applique le schéma Prisma
npm run db:seed              # (optionnel) catalogue de badges

# 4. Lancer en dev
npm run dev                  # http://localhost:3000
```

### Variables d'environnement clés

| Variable | Rôle |
|---|---|
| `AUTH_SECRET` | Secret NextAuth (`npx auth secret`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Connexion Google |
| `DATABASE_URL` / `DIRECT_URL` | Postgres |
| `FOOTBALL_DATA_TOKEN` | Token [football-data.org](https://www.football-data.org/client/register) (gratuit) |
| `FOOTBALL_DATA_COMPETITION` | Compétition à synchroniser (défaut `WC`) |
| `ODDS_API_KEY` | Clé [The Odds API](https://the-odds-api.com) (gratuit) pour le barème aux cotes — sans elle, repli barème classique |
| `ODDS_API_SPORT` / `ODDS_API_REGION` | Sport (défaut `soccer_fifa_world_cup`) et région bookmakers (défaut `eu`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte admin créé au démarrage |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push (`npx web-push generate-vapid-keys`) |
| `SYNC_LIVE_SECONDS` / `SYNC_IDLE_MINUTES` | Rythme de sync (défaut 90 s / 30 min) |

## 📜 Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de dev |
| `npm run build` | Build de prod (Prisma generate + Next build) |
| `npm run db:push` | Applique le schéma Prisma |
| `npm run db:seed` | Seed du catalogue de badges |
| `npm run db:studio` | Prisma Studio |
| `npm run sync` | Sync manuelle des matchs |
| `npm run rescore` | Recalcule tous les points (après changement de barème) |
| `npm run flags` | Pré-télécharge les drapeaux dans `public/flags/` |
| `npm test` | Lance les tests unitaires (Vitest) |

## ⚙️ Sous le capot

- **Synchronisation adaptative** — un hook d'instrumentation Next.js synchronise les scores en boucle : **rapide** (90 s) quand un match est en cours ou imminent, **lent** (30 min) sinon. Sous la limite de 10 req/min de l'API, sans plafond journalier.
- **Calcul des points centralisé** — une seule fonction `computePoints`, pure et testable, alimente le scoring, le recalcul, le live et les comparaisons. Les badges sont **réconciliés** à chaque recalcul (attribués *et* retirés s'ils ne sont plus mérités).
- **Drapeaux fiables** — rendus en image (flagcdn) avec auto-retry et cache service-worker, pour ne jamais afficher un drapeau manquant sur iOS.

## 📦 Déploiement

CI/CD GitHub Actions → **GHCR** (deux images : `:latest` pour l'app, `:migrate` pour `prisma db push`) → **Portainer**.

- L'image `migrate` applique le schéma avant le déploiement de l'app.
- Au démarrage, l'app initialise le catalogue de badges, le compte admin et le bot système — puis lance la boucle de sync.

---

<div align="center">

*Fait avec ⚽, 🍺 et beaucoup de mauvaise foi entre potes.*

</div>
