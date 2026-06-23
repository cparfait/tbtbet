# PROMPT DE DÉVELOPPEMENT — "TBT Bet" (Tournoi Babyfoot Withings)

> Précision avant de commencer : je n'ai pas eu accès au code réel de `C:\tmp\__DEV__\Pronos` ni au repo `daronscup` (chemin local Windows + repo privé, hors de portée). Ce prompt est construit à partir de ta description fonctionnelle de Darons FC (Next.js/TypeScript/Prisma/PostgreSQL, Docker, déployé via Nginx Proxy Manager) et du brief détaillé ci-dessous. **Avant de lancer le dev, relis la section "Réutilisation du projet Pronos" et ajuste les noms de fichiers/dossiers réels.**

---

## 0. Contexte à donner à l'IA de code (Claude Code, Cursor, etc.)

```
Je réutilise la base technique du projet "Pronos" (C:\tmp\__DEV__\Pronos), un projet
similaire à daronscup (foot.cparfait.ovh) : Next.js + TypeScript + Prisma + PostgreSQL,
déployé en Docker (docker-compose, Portainer, Nginx Proxy Manager).

Je veux en faire une nouvelle application : "TBT Bet", un tournoi de babyfoot interne
à l'entreprise Withings (10 équipes). C'est plus simple visuellement que Darons FC :
pas de groupes de paris, un chat global (pas de messagerie privée), pas d'API sportive externe (tout est saisi
à la main par un admin).
```

---

## 1. Réutilisation du projet Pronos — ce qu'on garde / ce qu'on jette

| Élément Darons FC / Pronos | Décision | Pourquoi |
|---|---|---|
| Stack Next.js + TypeScript + Prisma + PostgreSQL | ✅ Garder | Process déjà rodé |
| Déploiement Docker Compose + Nginx Proxy Manager | ✅ Garder | Infra déjà en place sur ton homelab |
| Auth utilisateurs (login/compte) | ✅ Garder | Nécessaire pour le classement nominatif |
| Système de "monnaie virtuelle" / points de pari | ✅ Garder, renommer en **Wizz** | Cœur du concept |
| Mécanique "pronostic de champion" | ✅ Garder | Demandé explicitement |
| Classement général | ✅ Garder, **un seul classement global** | Pas de notion de groupe d'amis |
| Récupération auto des matchs via API sportive externe | ❌ Supprimer entièrement | Pas d'API pour un babyfoot d'entreprise |
| Cron de sync scores en live | ❌ Supprimer | Remplacé par saisie manuelle admin |
| Système de groupes/ligues entre amis | ❌ Supprimer | Un seul classement pour tout le monde |
| Chat / messagerie | ✅ Ajouter | Un chat global est souhaité pour animer le tournoi |
| Brackets type Coupe du Monde (poules FIFA fixes) | 🔄 Adapter | Format spécifique 10 équipes, voir section 2 |
| DA / charte graphique Darons FC | ❌ Ne pas réutiliser | Nouvelle DA noir/blanc/jaune |

**Étapes concrètes :**
1. Fork/copie du repo `Pronos` → nouveau repo `tbt-bet`.
2. Supprimer : récupération API match, cron de sync scores, modèles Prisma liés à l'API externe. Conserver/adapter le module de chat (chat global unique, sans groupes).
3. Garder/adapter : modèle `User`, auth, modèle de monnaie (→ Wizz), système de pari, mécanique "champion", structure de composants (avant retouche DA).
4. Ajouter : back-office admin, modèle `Match` saisi manuellement, modèles `Pool`/`Bracket`, modèle `Joker`, logique de cotes variables (section 4).

---

## 2. Format du tournoi (10 équipes, 2 phases, 6 midis)

### Phase 1 — Poules (3 midis)
- 10 équipes réparties en poules (à définir : ex. 2 poules de 5, ou 3 poules de 3-3-4 — **à trancher avec toi, voir section 9**).
- Chaque équipe affronte toutes les autres équipes de sa poule (matchs aller simple).
- À l'issue de la phase de poules :
  - le **1er de chaque poule** est qualifié directement pour le **Winner Bracket**,
  - le **meilleur 2ème toutes poules confondues** (classement inter-poules par un critère à définir : différence de buts, nb de victoires, etc.) rejoint aussi le **Winner Bracket**,
  - **toutes les autres équipes** (2èmes non repêchés + 3èmes/4èmes/5èmes) démarrent la phase à élimination directement dans le **Loser Bracket**.

> ⚠️ Point à valider avec toi : le brief dit "la meilleure rejoint le winner bracket (ainsi que le meilleur des 2èmes)" — donc seulement **2 équipes** entrent directement en Winner Bracket si je lis au pied de la lettre (le 1er de chaque poule + le meilleur 2ème). Mais "le 1er de chaque poule" peut aussi vouloir dire plusieurs 1ers (un par poule) qualifiés. Il faut clarifier : **combien de poules exactement, et combien d'équipes au total entrent en Winner Bracket vs Loser Bracket ?** Voir section 9.

### Phase 2 — Élimination (3 midis)
- Système **Winner Bracket / Loser Bracket** (double élimination) :
  - une équipe qui perd un match en Winner Bracket descend en Loser Bracket plutôt que d'être éliminée,
  - une équipe qui perd en Loser Bracket est éliminée du tournoi,
  - le vainqueur du Loser Bracket affronte le vainqueur du Winner Bracket.
- **Finale en BO3** (Best of 3) : l'équipe qui gagne 2 matchs sur 3 remporte le tournoi. Les paris sur la finale doivent donc gérer **3 matchs successifs** liés à une même "rencontre finale" (voir modèle `FinalSeries` ci-dessous).

---

## 3. Lexique du projet (à respecter dans le code : modèles, variables, libellés UI)

- **Wizz** : monnaie virtuelle. Solde de départ : 100 Wizz.
- **Joker x2** : multiplicateur de gain. Chaque parieur en a 2, utilisables sur n'importe quel pari (match ou champion), un seul à la fois sur un pari donné.
- **Pari sur match** : pari sur l'issue d'un match (Victoire Équipe A / Victoire Équipe B / Égalité).
- **Pari Champion** : pari unique sur l'équipe qui remportera le tournoi, fait avant une date limite définie par l'admin.
- **Poule** : phase de groupe (3 midis), tirage au sort.
- **Winner Bracket** : arbre des équipes qui n'ont pas encore perdu en phase d'élimination.
- **Loser Bracket** : arbre des équipes ayant perdu un match en élimination, qui continuent à jouer.
- **Match croisé (« cross »)** : un match de la phase d'élimination qui oppose une équipe venant du Winner Bracket à une équipe venant du Loser Bracket — cote spéciale (voir section 4).
- **Match** : objet saisi manuellement par l'admin (nom/numéro libre, deux équipes, date, statut, résultat).
- **Récap de fin de tournoi** : page bilan affichée une fois le tournoi terminé (vainqueur, classement final des parieurs, stats).

---

## 4. Cotes de pari — règles précises (point clé du brief, à bien coder)

| Contexte du match | Pari sur... | Multiplicateur du gain |
|---|---|---|
| Phase de poules | n'importe quelle équipe | **x2** |
| Phase d'élimination, match "normal" (deux équipes du même bracket, Winner vs Winner ou Loser vs Loser) | n'importe quelle équipe | **x2** |
| Phase d'élimination, **match croisé** (une équipe du Loser Bracket contre une équipe du Winner Bracket) | l'équipe **venant du Loser Bracket** | **x3** |
| Phase d'élimination, **match croisé** | l'équipe **venant du Winner Bracket** | **x1.5** |

**Conséquences techniques :**
- Le modèle `Match` doit savoir d'où vient chaque équipe pour CE match précis (`teamASource: WINNER_BRACKET | LOSER_BRACKET | POOL`, idem teamB), pas seulement la phase générale du match. C'est ce flag qui détermine la cote applicable à chaque équipe, indépendamment l'une de l'autre.
- Le calcul du payout doit donc être **par équipe parieuse**, pas par match : si on parie sur l'équipe A (ex-Loser) on a x3, si on parie sur l'équipe B (ex-Winner) du même match on a x1.5.
- L'égalité : le brief mentionne "victoire de X ou de Y ou égalité" comme dans le 1er brief — à confirmer si l'égalité existe vraiment en babyfoot dans ton format (souvent il y a toujours un vainqueur). Si égalité possible, lui appliquer la cote x2 par défaut (à confirmer avec toi, ou définir une cote spécifique).
- Le Joker x2 se cumule en multipliant le multiplicateur de cote (ex: pari gagnant à x3 + joker → gain net x6). À confirmer que c'est bien l'effet souhaité et pas un comportement à plafonner.

---

## 5. Modèle de données (Prisma — à adapter aux modèles déjà existants dans Pronos)

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  wizzBalance   Int      @default(100)
  jokersLeft    Int      @default(2)
  isAdmin       Boolean  @default(false)
  createdAt     DateTime @default(now())

  bets          Bet[]
  championBet   ChampionBet?
}

model Team {
  id        String   @id @default(cuid())
  name      String
  player1   String?
  player2   String?
  logoUrl   String?
  poolId    String?
  pool      Pool?    @relation(fields: [poolId], references: [id])
  eliminated Boolean @default(false)

  matchesAsTeamA Match[] @relation("TeamA")
  matchesAsTeamB Match[] @relation("TeamB")
}

model Pool {
  id      String  @id @default(cuid())
  name    String  // "Poule A", "Poule B"...
  teams   Team[]
}

enum BracketSource { POOL WINNER_BRACKET LOSER_BRACKET }
enum MatchPhase { POOL WINNER_BRACKET LOSER_BRACKET FINAL_SERIES }
enum MatchStatus { SCHEDULED LIVE FINISHED CANCELLED }
enum MatchResult { TEAM_A TEAM_B DRAW }

model Match {
  id                String        @id @default(cuid())
  label             String        // libre, ex: "Quart 1", "Match 12"
  phase             MatchPhase
  round             Int?
  teamAId           String
  teamA             Team          @relation("TeamA", fields: [teamAId], references: [id])
  teamASource       BracketSource // d'où vient teamA POUR CE MATCH (détermine sa cote)
  teamBId           String
  teamB             Team          @relation("TeamB", fields: [teamBId], references: [id])
  teamBSource       BracketSource
  scheduledAt       DateTime?
  bettingClosesAt   DateTime?
  status            MatchStatus   @default(SCHEDULED)
  result            MatchResult?
  scoreA            Int?
  scoreB            Int?
  finalSeriesId     String?       // null sauf si ce match fait partie du BO3 final
  finalSeries       FinalSeries?  @relation(fields: [finalSeriesId], references: [id])
  createdAt         DateTime      @default(now())

  bets              Bet[]
}

// Série finale en BO3 : regroupe 2 ou 3 matchs liés
model FinalSeries {
  id            String   @id @default(cuid())
  teamAId       String
  teamBId       String
  teamAWins     Int      @default(0)
  teamBWins     Int      @default(0)
  winnerTeamId  String?
  matches       Match[]
}

model Bet {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  matchId     String
  match       Match        @relation(fields: [matchId], references: [id])
  choice      MatchResult
  amountWizz  Int
  oddsApplied Float        // snapshot de la cote au moment du pari (x2 / x1.5 / x3)
  jokerUsed   Boolean      @default(false)
  settled     Boolean      @default(false)
  payout      Int?
  createdAt   DateTime     @default(now())

  @@unique([userId, matchId])
}

model ChampionBet {
  id          String   @id @default(cuid())
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  amountWizz  Int
  jokerUsed   Boolean  @default(false)
  settled     Boolean  @default(false)
  payout      Int?
  createdAt   DateTime @default(now())
}
```

**Pourquoi `oddsApplied` est stocké sur le `Bet`** : si l'admin modifie une cote après coup, ou si la source d'une équipe change suite à une correction, les paris déjà placés ne doivent pas être recalculés rétroactivement avec une cote différente. On fige la cote au moment du pari.

---

## 6. Back-office Admin

Page `/admin`, protégée par `isAdmin` :

### 6.1 Gestion des équipes & poules
- CRUD équipe (nom, joueur(s), logo optionnel).
- Tirage au sort des poules (nombre de poules paramétrable), avec réajustement manuel par drag & drop après tirage.

### 6.2 Gestion des matchs
- Formulaire de création : label libre, phase, sélection des 2 équipes, **source de chaque équipe pour ce match** (Poule / Winner / Loser — déterminant la cote), date/heure, date limite de pari.
- Vue calendrier chronologique + vue par phase.
- Saisie du résultat → déclenche automatiquement :
  - règlement des paris (`settled = true`, calcul `payout` selon `oddsApplied` + joker),
  - crédit du `wizzBalance` des gagnants,
  - mise à jour du classement de poule,
  - si phase d'élimination : passage automatique proposé de l'équipe perdante en Loser Bracket (validé/ajusté manuellement par l'admin),
  - si match de Finale : incrémentation de `FinalSeries.teamAWins`/`teamBWins`, clôture de la série dès qu'une équipe atteint 2 victoires.

### 6.3 Paramétrage du tournoi
- Nombre de poules, critère de départage pour "meilleur 2ème", date de clôture du pari Champion.
- Vue d'ensemble du bracket en lecture, avec édition manuelle des enchaînements de matchs si besoin (pas de génération automatique rigide — saisie/ajustement manuel match par match, plus fiable pour 10 équipes).

---

## 7. Fonctionnalités côté joueur

### 7.1 Page "Parier" (matchs à venir)
- Liste des matchs `SCHEDULED` non encore clos pour le pari.
- 3 boutons (Victoire A / Égalité / Victoire B) avec **la cote affichée par équipe** (ex: "Équipe Loser — x3" / "Équipe Winner — x1.5" sur un match croisé).
- Champ montant en Wizz (max = solde dispo), toggle Joker x2 (désactivé si indisponible).
- Un seul pari actif par match et par joueur, modifiable jusqu'à fermeture.

### 7.2 Pari "Choix du Champion"
- Une fois (modifiable jusqu'à date limite admin) : équipe + montant + joker éventuel. Résolu uniquement à la fin du tournoi.

### 7.3 Classement général
- Tableau unique trié par solde Wizz décroissant. Wizz "en jeu" sur le pari Champion non réglé affichés à part.

### 7.4 Poules & Brackets (lecture)
- Vue Poules : classement par poule.
- Vue Bracket : Winner Bracket + Loser Bracket affichés visuellement, avec la Finale BO3 mise en avant (score de série en cours, ex: "1-0", "1-1").

### 7.5 Résultats des matchs précédents
- Liste/historique des matchs `FINISHED`, avec score, et éventuellement le résultat du pari de l'utilisateur sur ce match (gagné/perdu/montant).

### 7.6 Récap de fin de tournoi
- Page affichée une fois le dernier match de la finale joué : équipe championne, classement final des parieurs (podium), peut-être quelques stats fun (plus gros pari gagnant, meilleur usage de joker, etc. — optionnel, à voir si tu veux enrichir).

### 7.7 Chat global
- Un chat unique commun à tous les participants (pas de messagerie privée, pas de groupes).
- Accessible depuis la navigation principale.
- Sert à animer le tournoi : réactions, trash talk, commentaires de matchs.

### 7.8 Ce que l'application N'A PAS
- Pas de messagerie privée entre utilisateurs.
- Pas de groupes/ligues de parieurs.

---

## 8. Direction artistique

- **Nom de l'application : TBT Bet** (à utiliser partout : titre, header, favicon, métadonnées).
- **Palette** : Noir / Blanc / Jaune (jaune en accent/CTA, pas en grande surface pour la lisibilité).
- **Typo titres** : à définir (placeholder pour l'instant — ne pas lancer le design final avant d'avoir choisi).
- **Typo texte** : Aeonik.
- **Ton visuel** : sportif, dynamique, simple — volontairement plus minimaliste que Darons FC (moins d'écrans, moins de fioritures).
- **Responsive obligatoire** PC/Mac + smartphone, avec priorité mobile sur les écrans Parier, Classement, Résultats (probablement consultés depuis le téléphone pendant la pause déjeuner).

---

## 9. Navigation — barre du bas (mobile-first)

Par rapport à Darons FC, la navigation est volontairement réduite à **4 onglets maximum** :

| Onglet | Icône indicative | Contenu |
|---|---|---|
| **Parier** | 🎲 | Matchs à venir + pari Champion (matchs SCHEDULED, ouverts aux paris) |
| **Matchs** | 📅 | Vue unifiée : matchs à venir **et** résultats passés (onglets internes ou scroll), remplace les deux onglets séparés "Matchs" et "Résultats" de Darons FC |
| **Classement** | 🏆 | Classement général des parieurs (Wizz) + poules + bracket |
| **Chat** | 💬 | Chat global du tournoi |

**Règles à respecter :**
- **Pas d'onglet "Profil"** en barre de navigation : le profil/compte utilisateur est accessible uniquement via l'**avatar** (coin haut droit du header), comme sur Darons FC. Inutile de le dupliquer en bas.
- Les onglets "Matchs" et "Résultats" sont **fusionnés en un seul onglet "Matchs"** : la distinction se fait par un filtre ou des sous-onglets internes à la page (À venir / Terminés), pas par deux entrées de navigation séparées.
- Le lot de refonte DA (Lot 9) devra inclure une passe sur cette navigation pour s'assurer qu'elle reste à 4 entrées.

---

## 10. Découpage en lots de développement

1. **Lot 0 — Setup** : fork du repo Pronos, suppression API sportive externe + groupes, adaptation du module chat (→ chat global unique), mise à jour schéma Prisma, migration DB.
2. **Lot 1 — Auth & Wizz** : init solde 100 Wizz + 2 jokers à la création de compte.
3. **Lot 2 — Admin équipes & poules** : CRUD équipes, tirage au sort, ajustement manuel, réglage du nombre de poules pour 10 équipes.
4. **Lot 3 — Admin matchs & calendrier** : CRUD match (label libre, source d'équipe par match), calendrier, saisie résultat + règlement auto des paris avec cotes variables.
5. **Lot 4 — Pari sur match (joueur)** : UI de pari avec cote dynamique affichée par équipe, gestion joker.
6. **Lot 5 — Pari Champion**.
7. **Lot 6 — Classement général**.
8. **Lot 7 — Vue Poules + Vue Bracket (Winner/Loser) + Finale BO3** en lecture, avec édition manuelle admin.
9. **Lot 8 — Chat global** : messagerie en temps réel commune à tous les participants (WebSocket ou polling), sans groupes ni messages privés.
10. **Lot 9 — Historique des résultats + Récap de fin de tournoi**.
11. **Lot 10 — DA finale** : palette noir/blanc/jaune, typo titre (une fois choisie) + Aeonik, passe responsive complète, vérification navigation 4 onglets (cf. section 9).
12. **Lot 11 — Déploiement** : Docker Compose + Nginx Proxy Manager sur ton infra existante (Portainer), comme pour daronscup.

---

## 11. Points à clarifier avec toi avant de lancer le Lot 0

1. **Format exact des poules** : combien de poules pour 10 équipes (ex: 2 poules de 5 ? 3 poules de 3-3-4 ?), et combien d'équipes au total démarrent directement en Winner Bracket (juste 2, ou un 1er par poule + le meilleur 2ème) ?
2. **Critère de départage** "meilleur 2ème toutes poules confondues" : différence de buts, nombre de victoires, points marqués ?
3. **L'égalité existe-t-elle vraiment** dans un match de babyfoot dans ton format (BO1 ?), ou est-ce un cas qui ne se présentera jamais en pratique ?
4. **Format des équipes** : solo ou duo (1 ou 2 joueurs par équipe) ?
5. **Cumul Joker x cote x3/x1.5** : confirmer que l'effet attendu est bien une simple multiplication (x3 + joker = x6 sur le gain net), sans plafond.
6. **Nom réel de la typo de titre** (actuellement "à définir").
7. **Stats bonus sur le récap de fin de tournoi** : tu veux en ajouter, ou rester minimal (juste le classement final + le champion) ?

---

*Ce document est prêt à être collé tel quel à Claude Code (ou équivalent) comme prompt de cadrage initial, lot par lot.*
