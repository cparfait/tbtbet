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

**TBT Bet** est une appli web (PWA installable) de pronostics pour le **Tournoi de Babyfoot** (10 équipes). Tu paries sur chaque match avec ta réserve de **Wizz**, joues tes **Jokers ×2**, et grimpes au classement des parieurs — le tout animé par un **chat global** et un **tirage au sort en temps réel**.

Tout est saisi manuellement par l'admin (pas d'API externe).

---

## ✨ Fonctionnalités

- 🎲 **Paris sur les matchs** — choisis le vainqueur avant le coup de sifflet, mise tes Wizz
- 🔥 **Jokers ×2** — 2 par joueur, doublent le gain d'un pari gagnant
- 🏆 **Pari Champion** — pronostique l'équipe victorieuse du tournoi (gratuit, sans mise Wizz)
- 📊 **Classement des parieurs** — trié par solde Wizz décroissant
- 🥅 **Classements de poules** — standings complets (V, DB, Pts) par poule
- 🌳 **Bracket double élimination** — Winner Bracket + Loser Bracket + Finale BO3
- 📡 **Tirage au sort animé** — révélation équipe par équipe, synchronisé sur tous les écrans en temps réel
- 📈 **Système ELO** — cotes dynamiques et classement ELO mis à jour après chaque match
- 💬 **Chat global** — un seul tchat pour tout le monde, réactions emoji
- 🔔 **Notifications push** — alertes matchs et résultats (PWA)

---

## ⚽ Format du tournoi

### Phase de poules

- **3 poules** : A (3 équipes) · B (3 équipes) · C (4 équipes)
- Matchs aller uniquement, round-robin au sein de chaque poule
- Classement : **3 pts** victoire · **1 pt** nul · **0 pt** défaite
- Égalité : goal difference puis buts marqués

### Tirage au sort

Une fois tous les matchs de poule terminés, l'admin lance le tirage depuis la console.  
L'animation est **diffusée en temps réel** sur tous les appareils connectés :

- L'admin **clique** pour révéler chaque équipe une par une
- Les joueurs suivent **automatiquement** (~1 s de délai)

**Affectation initiale au bracket :**

| Bracket | Équipes |
|---|---|
| **Winner Bracket (WB)** | A1, A2, B1, B2, C1, C2 — les 6 premiers de poule |
| **Loser Bracket (LB)** | A3, B3, C3, C4 — les 4 derniers |

Les paires sont tirées **aléatoirement** à l'intérieur de chaque bracket.

---

## 🌳 Double élimination — règles du bracket

### Principe

- **2 défaites = éliminé**
- Perdre en WB → descend en LB (1re défaite)
- Perdre en LB → éliminé (2e défaite)
- Gagner en LB → reste en LB, jusqu'à disputer la finale contre le champion WB

### Progression automatique des tours

Une fois tous les résultats d'un tour saisis, le bouton **"⚡ Générer le tour suivant"** apparaît dans l'onglet Tirage. En un clic :

1. **WB suivant** — créé avec les gagnants WB du tour précédent
2. **LB suivant** — créé avec les survivants LB + les perdants WB entrant en LB
3. **Bye automatique** — si nombre impair d'équipes dans un bracket, une équipe est tirée au sort pour passer directement au tour d'après (sans match)
4. **Finale BO3** — générée automatiquement dès qu'il reste 1 champion WB et 1 champion LB

### Grande Finale (Best of 3)

- WB champion vs LB champion, **sans avantage bracket**
- Match 1 + Match 2 créés d'emblée
- Match 3 généré automatiquement si score 1-1
- Premier à **2 victoires** remporte le tournoi

---

## 📈 Système ELO

Chaque équipe commence à **ELO 1000**. L'ELO est mis à jour automatiquement à chaque résultat.

### Formule

```
ΔA = K × (résultat_A − E_A) × multiplicateur_buts
ΔB = −ΔA   (somme nulle)
```

**Probabilité attendue :**
```
E_A = 1 / (1 + 10^((ELO_B − ELO_A) / 400))
```

| Paramètre | Valeur |
|---|:---:|
| Facteur K | **50** |
| Base | **400** |
| ELO initial | **1 000** |

**Multiplicateur selon l'écart de buts :**

| Écart | Multiplicateur |
|---|:---:|
| ≤ 1 but | × 1,0 |
| 2 buts | × 1,5 |
| ≥ 3 buts | × log(écart + 1) + 1 |

En cas de **correction** d'un résultat, l'ancien delta ELO est annulé avant d'appliquer le nouveau.

---

## 🎲 Système de paris

### Monnaie — les Wizz

- Chaque joueur démarre avec **100 Wizz**
- Monnaie virtuelle, aucune valeur réelle

### Cotes dynamiques (ELO-based)

Les cotes sont calculées en temps réel à partir de l'ELO des deux équipes :

```
cote_équipe = 1 / P(équipe gagne)
```

où `P` est la probabilité ELO. Plafonnée entre **×1,1** et **×15,0**.

- À ELO identique (1 000 vs 1 000) → cote **×2,0** pour chaque équipe
- Plus l'écart ELO est grand, plus la cote du favori baisse et celle de l'outsider monte

**Cote nul :** ×2,0 fixe — disponible uniquement en phase de poules.

### Joker

- Chaque joueur dispose de **2 jokers** sur l'ensemble du tournoi
- Activer un joker **double** le gain : `payout = mise × cote × 2`

### Règlement

- Les paris se ferment quand l'admin passe le match en **LIVE** 🔴
- Les gains sont crédités automatiquement à la saisie du résultat
- En cas de **correction** de résultat, tous les paris sont recalculés (gains précédents annulés et recréés)

---

## 🛠️ Console admin

Accessible sur `/admin` (compte `ADMIN` requis).

| Onglet | Actions |
|---|---|
| **Équipes** | Créer, supprimer, assigner à une poule, uploader logo, modifier ELO manuellement |
| **Poules** | Créer, définir couleur, gérer équipes |
| **Matchs** | Générer les matchs de poule (round-robin auto), créer matchs manuels, programmer dates |
| **Résultats** | Saisir scores, passer en LIVE 🔴, corriger un résultat |
| **Joueurs** | Créer comptes, bannir/débannir, promouvoir admin |
| **ELO** | Classement ELO actuel + historique des deltas par match |
| **Tirage** | Lancer le tirage animé · Générer les tours bracket suivants |
| **Outils** | Reset complet · Injecter données de démo · Distribuer des Wizz |

---

## 🚀 Démarrage local

```bash
# 1. Base de données
docker compose -f docker-compose.local.yml up -d

# 2. Dépendances
npm install

# 3. Schéma
npx prisma db push

# 4. Dev
npm run dev   # http://localhost:3000
```

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL |
| `AUTH_SECRET` | Secret NextAuth (min 32 chars) |
| `AUTH_URL` | URL publique de l'app |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Compte admin initial |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Notifications push (optionnel) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | OAuth Google (optionnel) |

### Scripts npm

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run db:push` | Applique le schéma Prisma |
| `npm run db:studio` | Interface Prisma Studio |

---

## 🐳 Déploiement (CI/CD)

Chaque push sur `main` déclenche GitHub Actions :

1. Build de l'image Docker (`ghcr.io/cparfait/tbtbet:latest` + `:migrate`)
2. Push sur GitHub Container Registry
3. Webhook Portainer → pull + redémarrage automatique

La migration DB (`prisma db push`) est exécutée par un container dédié (`migrate`) au démarrage, avant l'app.

---

## 🗄️ Stack

| Couche | Technologie |
|---|---|
| Framework | Next.js 15 — App Router, React 19, Server Components |
| Base de données | PostgreSQL via Prisma 6 |
| Auth | NextAuth v5 — credentials + Google OAuth |
| UI | Tailwind CSS 4 + shadcn/ui |
| Déploiement | Docker · GitHub Actions · Portainer |
| PWA | Service Worker + Web Push (VAPID) |

---

<div align="center">

*Fait avec ⚽, du café et beaucoup de mauvaise foi entre collègues.*

Merci à **Clem** pour l'idée et **Atlas002** pour le support 🙏

</div>
