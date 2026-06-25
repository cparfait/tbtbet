# Suivi du projet TBT Bet

## ✅ Terminé

- Nav [Classement | Accueil | Profil] (suppression du Chat)
- Stat "Rang" (ex-Jokers) sur la home + profil
- Noms des joueurs (player1 & player2) sur les cartes match
- Matchs futurs grisés sur la home
- Bouton "Modifier le pari" : gris si aucune modif, jaune si dirty
- Suppression des nuls pour tous les matchs (UI seulement, l'enum DRAW reste dans l'API pour l'historique)
- Rename "Wizz" → "Wiz" + "Joker ×2" → "Bonus ×2" partout (UI, welcome modal, landing, register)
- Fix photos dans le classement (fallback sur le champ `image` Google OAuth)
- Favicon + icônes PWA remplacés par le vrai logo (logo.jpeg → tous les PNG générés via sharp)
- Stats profil sur 2 lignes + paris groupés par jour avec coloration vert/rouge
- Bracket en tête du classement quand la phase éliminatoire a commencé
- Édition du pseudo en ligne (icône crayon, sans rechargement de page)
- **Bonus ×2 par phase** : 1 utilisable en poules, 1 en éliminations — validé côté UI et API
- **Pop-up "Choisis ton champion"** sur la home (s'affiche si pas encore de choix, se ferme avec "Plus tard")
- **Admin — Donner des Wiz à tous** : input + bouton dans l'onglet Outils
- **Système ELO** (méthode du pote) : K=50, multiplicateur goal diff, cotes dérivées de l'ELO (`cote = 1/P`), deltas stockés sur les matchs pour corrections rétroactives
- **Responsive PC** : `max-w-md md:max-w-2xl lg:max-w-4xl` dans le layout + grilles 2 colonnes sur dashboard (matchs du jour + grisés)
- **Bouton LIVE** : admin onglet Résultats → bouton 🔴/⏸ par match non terminé, bloque les paris côté API et UI ; badge LIVE sur les cartes dashboard/calendrier
- **Modification rétroactive des résultats** : déjà fonctionnel côté backend ; les matchs FINISHED sont sélectionnables dans l'onglet Résultats (bouton "Corriger le résultat")
- **ELO éditable (admin)** : input inline dans l'onglet Équipes (blur/Entrée → PATCH `/api/admin/teams`)
- **Probabilités dans le formulaire de pari** : `probA`/`probB` (%) affichés sous les cotes dans `BetForm`, calculés via `expectedScore()`
- **Responsive PC complet** : leaderboard (grille 2 col parieurs + poules), profil (sidebar gauche + colonne paris), calendrier matchs terminés en 2 col, admin max-w-2xl/4xl
- **ELO côté utilisateur** : ELO affiché dans le hero de chaque page de match (sous le nom de l'équipe)
- **Historique ELO admin** : nouvel onglet "ELO" dans l'admin → classement ELO actuel + historique des deltas par match
- **Rename "Joker ×2" → "Bonus ×2"** : dernières occurrences UI corrigées (`page.tsx` match detail + landing page)

---

## 🔲 Reste à faire

Rien — toutes les fonctionnalités sont implémentées.

> Note : les icônes PWA ont été générées depuis `logo.jpeg` via sharp. Pour une meilleure qualité, refaire depuis une version vectorielle (SVG) si disponible.
