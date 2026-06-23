<div align="center">

# ⚽ TBT Bet

### Le tournoi de babyfoot interne — parie, grimpe, deviens champion

*Pronostique chaque match, joue tes jokers, chambre tes collègues dans le tchat.*

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

**TBT Bet** est une appli web (PWA installable) de pronostics pour le **Tournoi de Babyfoot Withings** (10 équipes). Tu paries sur chaque match avec ta réserve de **Wizz**, joues tes **Jokers ×2**, et grimpes au classement des parieurs — le tout animé par un **chat global** pour la mauvaise foi d'usage.

Tout est saisi manuellement par l'admin (pas d'API externe).

## ✨ Les fonctionnalités

- 🎲 **Paris sur les matchs** — choisis le vainqueur avant le coup de sifflet, mise tes Wizz.
- 🔥 **Jokers ×2** — 2 par joueur, doublent le gain d'un pari gagnant.
- 🏆 **Pari Champion** — pronostique l'équipe victorieuse du tournoi (gratuit, sans mise Wizz).
- 📊 **Classement des parieurs** — trié par solde Wizz décroissant.
- 🥅 **Classements de poules** — standings complets (V, DB, Pts) par poule.
- 🌳 **Bracket double élimination** — Winner Bracket + Loser Bracket + Finale BO3.
- 💬 **Chat global** — un seul tchat pour tout le monde, réactions emoji.
- 👤 **Modale de bienvenue** — explication des règles + choix de l'équipe favorite à la 1ère connexion.
- 🛠️ **Console admin** — CRUD équipes (logo), poules, génération auto des matchs de poules, saisie des résultats, création de comptes joueurs.

## 🧮 Les cotes

| Contexte | Cote |
|---|:---:|
| Phase de poules | **×2** |
| Bracket — match normal (même bracket) | **×2** |
| Bracket — match croisé, équipe du Loser Bracket | **×3** |
| Bracket — match croisé, équipe du Winner Bracket | **×1.5** |
| + Joker activé | **× 2** (cumulé) |

## ⚽ Format du tournoi

### Phase de poules
- 3 poules : **A** (3 équipes) · **B** (3 équipes) · **C** (4 équipes)
- Matchs aller uniquement, round-robin dans chaque poule
- Classement : 3 pts/victoire, 1 pt/nul, diff. de buts, buts marqués

### Qualification
- 1er et 2ème de chaque poule → **Winner Bracket** (6 équipes)
- 3ème et 4ème → **Loser Bracket** (4 équipes)

### Double élimination
- Perdant du WB → LB (1ère défaite)
- Perdant du LB → éliminé (2ème défaite)

### Grande Finale (Best of 3)
- WB winner vs LB winner, sans avantage bracket
- Match 1 + Match 2 obligatoires, Match 3 si 1-1 (généré automatiquement)

## 🛠️ Stack

- **[Next.js 15](https://nextjs.org/)** — App Router, React 19, Server Components
- **[TypeScript](https://www.typescriptlang.org/)** strict
- **[Prisma 6](https://www.prisma.io/)** + **PostgreSQL**
- **[NextAuth v5](https://authjs.dev/)** — credentials + Google OAuth
- **[Tailwind CSS 4](https://tailwindcss.com/)** — palette noir/blanc/jaune
- **[sharp](https://sharp.pixelplumbing.com/)** — génération des icônes PWA

## 🚀 Démarrage

```bash
npm install
cp .env.example .env.local   # remplis DATABASE_URL, AUTH_SECRET, etc.
npm run db:push
npm run dev                  # http://localhost:3000
```

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `AUTH_SECRET` | Secret NextAuth |
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte admin initial |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Push PWA |

## 📜 Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de dev |
| `npm run build` | Build de prod |
| `npm run db:push` | Applique le schéma Prisma |
| `npm run db:studio` | Prisma Studio |
| `node scripts/generate-icons.mjs` | Régénère les icônes PWA |

---

<div align="center">

*Fait avec ⚽, du café et beaucoup de mauvaise foi entre collègues.*

</div>
