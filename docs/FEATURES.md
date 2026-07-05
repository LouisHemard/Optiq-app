# Fonctionnalités OPTIQ

Référence exhaustive de toutes les fonctionnalités utilisateur de la plateforme.

---

## Sommaire

1. [Authentification](#1-authentification)
2. [Profil utilisateur](#2-profil-utilisateur)
3. [Paramètres du compte](#3-paramètres-du-compte)
4. [Upload de photo](#4-upload-de-photo)
5. [Page d'une photo](#5-page-dune-photo)
6. [Critiques visuelles avec annotations](#6-critiques-visuelles-avec-annotations)
7. [Likes](#7-likes)
8. [Feed d'accueil & filtres](#8-feed-daccueil--filtres)
9. [Page Explore](#9-page-explore)
10. [Système d'abonnements](#10-système-dabonnements)
11. [Notifications](#11-notifications)
12. [Recherche d'utilisateurs](#12-recherche-dutilisateurs)
13. [Navigation & UX](#13-navigation--ux)

---

## 1. Authentification

### Inscription (`/register`)
- Formulaire avec **email**, **username**, **mot de passe**
- Le mot de passe est **haché avec bcrypt** (10 rounds) avant stockage
- Email et username sont **uniques** (contrainte Prisma)
- Connexion automatique après inscription réussie

### Connexion (`/login`)
- Formulaire email + mot de passe
- Le backend vérifie le hash via `bcrypt.compare`
- En cas de succès, retourne :
  - Un **JWT** signé valable **7 jours**
  - L'objet utilisateur (`id`, `email`, `username`, `avatarUrl`)
- Le token est stocké dans `localStorage` sous la clé `optiq_token`
- Toutes les requêtes Axios sortantes injectent automatiquement `Authorization: Bearer <token>` via un intercepteur

### Session
- Au démarrage de l'app, le `AuthContext` restaure la session depuis le localStorage
- Le bouton "Déconnexion" (icône porte) vide le state et le storage

---

## 2. Profil utilisateur

### Page profil (`/profile/:id`)

**Affichage** :
- Avatar (ou cercle générique si non défini)
- Username + badge "🔒 Privé" si applicable
- Bio (max 300 caractères)
- Compteurs : **photos**, **abonnés**, **abonnements**

**Bouton d'action contextuel** :
| Cas | Bouton affiché |
|---|---|
| Profil m'appartient | "Modifier le profil" → `/settings` |
| Visiteur, profil public | "S'abonner" / "Abonné" |
| Visiteur, profil privé, pas de demande | "S'abonner" |
| Visiteur, profil privé, demande envoyée | "En attente" (ambre) |
| Visiteur, profil privé, abonné | "Abonné" |

**Grille de photos** :
- Si profil public OU si je suis abonné OU si c'est mon profil → toutes les photos sont affichées
- Si profil privé et que je ne suis pas abonné → message "Ce compte est privé"

---

## 3. Paramètres du compte

### Page paramètres (`/settings`)

Page protégée (redirige vers `/login` si non connecté).

**Champs modifiables** :

- **Photo de profil (URL)** : champ texte avec **prévisualisation en direct** de l'avatar
- **Bio** : textarea avec compteur de caractères (max 300)
- **Confidentialité** : toggle switch Public / Privé
  - Public : tout le monde voit les photos
  - Privé : seuls les abonnés voient les photos

**Comportement** :
- Bouton "Enregistrer les modifications" avec état de chargement
- En cas de succès : message "Modifications enregistrées !" puis redirection vers le profil après 800 ms
- L'avatar est mis à jour dans le `AuthContext` pour refléter immédiatement le changement dans la navbar

---

## 4. Upload de photo

### Page d'upload (`/upload`)

Page protégée. Si non connecté → bouton "Se connecter".

**Formulaire** :
- **Image** (drag & drop ou sélection)
- **Titre**
- **Description** (optionnelle)
- **Appareil photo** : menu déroulant avec :
  - 20+ modèles populaires (Sony A7 III/IV/R V, Canon R5/R6 II, Fujifilm X-T5, Nikon Z8, Leica Q3, iPhone, etc.)
  - Option "Autre appareil (préciser)..." → champ texte libre

**Côté backend** :
- Le fichier est traité via **Multer en mémoire** (limite 50 Mo)
- L'image est uploadée vers le stockage configuré (local par défaut, fallback Supabase/Cloudinary)
- `exifr` extrait automatiquement les EXIF depuis le buffer :
  - Aperture (`f/`)
  - Vitesse d'obturation (sous forme décimale, formatée côté client en `1/1000`)
  - ISO
  - Focale (mm)
  - Modèle d'objectif
- Le `cameraModel` saisi manuellement par l'utilisateur **prime sur les EXIF**

---

## 5. Page d'une photo

### Affichage (`/photo/:id`)

**Header** :
- Titre
- Auteur (avatar + username) **cliquable → vers son profil**
- Bouton like avec compteur
- Bouton "Supprimer" (uniquement si je suis le propriétaire) avec confirmation en deux clics

**Layout deux colonnes** :

| Colonne gauche (2/3) | Colonne droite (1/3) |
|---|---|
| Canvas Konva (image + outils de dessin) | Panneau EXIF (masqué si vide) |
| | Liste des critiques |
| | Formulaire d'ajout de critique |

**Panneau EXIF** :
- Affiche uniquement les champs renseignés
- Chaque badge a une **icône Lucide** dédiée (Camera, Aperture, CircleDot, Timer, Gauge, Focus)
- **Tooltip au survol** avec titre + explication pédagogique (ex: "Vitesse d'obturation : durée d'exposition du capteur. Une vitesse rapide (1/1000) fige le mouvement...")

**Vitesse d'obturation** : convertie automatiquement
- `"0.001"` → `1/1000`
- `"0.025"` → `1/40`
- `"2"` → `2s`

**Critiques** :
- Chaque critique affiche : contenu, auteur (cliquable), miniature de l'image avec annotations
- Bouton de suppression (×) visible au survol uniquement si je suis l'auteur de la critique

---

## 6. Critiques visuelles avec annotations

Une **critique** est composée d'un texte + 0 à 6 annotations dessinées directement sur la photo.

### Outils de dessin

Activation : bouton **"Mode dessin"** au-dessus du canvas. Une fois activé, deux outils sont disponibles :

#### Outil Rectangle
- Cliquer-glisser pour dessiner une zone rectangulaire
- Le rectangle est rempli en couleur semi-transparente (60% pendant le dessin, 85% une fois posé)
- Coordonnées normalisées (0 à 1) → indépendant de la résolution

#### Outil Forme libre
- Tracé à main levée (suit la souris)
- À la fin du tracé :
  1. **Algorithme Ramer-Douglas-Peucker** : simplifie la courbe en supprimant les points superflus (tolérance de 4 px)
  2. **Fermeture automatique** : la forme devient un polygone fermé connectant le dernier point au premier
  3. **Remplissage semi-transparent** comme pour les rectangles

### Système de couleurs

Les annotations sont automatiquement colorées dans cet ordre :

| Index | Couleur | Hex |
|---|---|---|
| 1 | Rouge | `#ef4444` |
| 2 | Vert | `#22c55e` |
| 3 | Bleu | `#3b82f6` |
| 4 | Ambre | `#f59e0b` |
| 5 | Violet | `#a855f7` |
| 6 | Rose | `#ec4899` |

### Pastilles de gestion

À droite du bouton "Mode dessin" :
- Une pastille remplie pour chaque annotation existante
- **Clic sur une pastille = suppression** de l'annotation correspondante (× au survol)
- Une pastille vide en pointillés indique la couleur de la prochaine annotation

### Préservation du ratio

Le canvas Konva calcule dynamiquement ses dimensions à partir du ratio naturel de l'image (`naturalWidth` / `naturalHeight`) pour ne **jamais étirer** la photo, qu'elle soit portrait, panoramique ou carrée.

### Miniatures dans les critiques

Chaque critique affiche une miniature compacte (≤ 12rem) avec :
- Rectangles en `<div>` absolu avec bordure + remplissage 25%
- Formes libres en `<svg>` avec `<polygon>` (`viewBox="0 0 1 1"` pour normalisation automatique)

---

## 7. Likes

### Bouton like
Disponible sur :
- Chaque `PhotoCard` (feed, profil, explore)
- La page d'une photo (gros bouton à côté du titre)

### Update optimiste

Au clic :
1. **Mise à jour immédiate** du compteur et de l'icône (cœur rouge plein vs vide)
2. Appel API `POST /photos/:id/like` en arrière-plan
3. Si l'API échoue → **rollback** automatique du state local

Le backend renvoie `{ liked: boolean, likesCount: number }` après avoir créé ou supprimé l'enregistrement `Like` (clé composite `userId + photoId`).

---

## 8. Feed d'accueil & filtres

### Page d'accueil (`/`)

Grille de toutes les photos triées par date décroissante. Chaque carte (`PhotoCard`) affiche :
- Image (avec placeholder si erreur de chargement)
- Titre + description (tronquée à 2 lignes)
- Badges EXIF avec tooltips
- Auteur cliquable
- Compteurs likes + commentaires

### Filtres avancés

Bouton "Filtres avancés" qui déploie un panneau avec :

| Champ | Type | Backend |
|---|---|---|
| `cameraModel` | Texte | Recherche `contains` insensible à la casse |
| `lensModel` | Texte | Recherche `contains` insensible à la casse |
| `minIso` | Nombre | `iso >= minIso` |
| `maxIso` | Nombre | `iso <= maxIso` |

Boutons "Rechercher" et "Réinitialiser". Un point blanc indique la présence de filtres actifs sur le bouton.

---

## 9. Page Explore

### Tableau d'Honneur (`/explore`)

Affiche les **20 meilleures photos des 7 derniers jours** (rolling window, recalculée à chaque requête).

### Algorithme de tri (Prisma)

```ts
where: { createdAt: { gte: sevenDaysAgo } },
take: 20,
orderBy: [
  { perfectCount: 'desc' },        // 1. Photos "Perfect"
  { likes: { _count: 'desc' } },   // 2. Photos les plus likées
  { createdAt: 'desc' },           // 3. Plus récentes en cas d'égalité
]
```

### Affichage
- Titre stylisé "🏆 Meilleures photos de la semaine 🏆"
- Sous-titre : "Les photos les plus appréciées de ces 7 derniers jours"
- Les **3 premières** ont un badge or (1, 2, 3) en coin supérieur gauche

### Barre de recherche d'utilisateurs

En haut de la page : input "Trouver un photographe..."
- Recherche déclenchée à partir de **2 caractères**
- **Debounce de 300 ms** pour éviter de spammer l'API
- Résultats limités à 10 (insensible à la casse)
- Clic sur un résultat → page profil

---

## 10. Système d'abonnements

### Profil public
- Clic sur "S'abonner" → connexion immédiate via Prisma `connect`
- Le bouton devient "Abonné"
- Re-clic → déconnexion (`disconnect`)

### Profil privé

#### Envoi d'une demande
- Clic sur "S'abonner" → crée une `FollowRequest` avec statut `PENDING`
- Crée simultanément une `Notification` de type `FOLLOW_REQUEST` pour la cible
- Le bouton devient "En attente" (ambre)

#### Annulation
- Re-clic sur "En attente" → supprime la `FollowRequest`

#### Acceptation par la cible
Via l'onglet "Demandes" du dropdown notifications :
- **Accepter** → connecte les deux users + supprime la requête + crée une `Notification` de type `FOLLOW_ACCEPTED` pour le demandeur
- **Refuser** → supprime la requête (aucune notification envoyée au demandeur)

---

## 11. Notifications

### Cloche dans la navbar (utilisateur connecté uniquement)

- **Badge rouge** avec compteur des notifications non lues
- Polling toutes les 30 secondes pour rafraîchir le compteur

### Dropdown au clic

Deux onglets :

#### Onglet "Notifications"
Liste des 50 dernières, triées par date décroissante. Pour chaque notification :
- Icône selon type (`UserPlus` pour FOLLOW_REQUEST, `UserCheck` pour FOLLOW_ACCEPTED, `MessageCircle` pour NEW_REVIEW)
- Message + temps relatif (`il y a 5min`, `il y a 2h`)
- Indicateur bleu si non lue
- Cliquable vers le profil concerné via `relatedId`
- Bouton "Tout marquer comme lu" en haut

#### Onglet "Demandes"
Liste des `FollowRequest` reçues avec statut `PENDING` :
- Avatar + username du demandeur (cliquable vers son profil)
- Bouton vert "Accepter" + bouton gris "Refuser"
- Mise à jour optimiste : la demande disparaît immédiatement de la liste

### Types de notifications

| Type | Déclencheur | Message |
|---|---|---|
| `FOLLOW_REQUEST` | Demande d'abonnement reçue | "X souhaite vous suivre." |
| `FOLLOW_ACCEPTED` | Demande acceptée | "X a accepté votre demande d'abonnement." |
| `NEW_REVIEW` | _(prévu pour usage futur)_ | _N/A_ |

---

## 12. Recherche d'utilisateurs

Endpoint dédié : `GET /users/search?q=<query>`
- Recherche `contains` sur `username`, insensible à la casse
- Limite de 10 résultats
- Tri alphabétique
- Retourne uniquement `{ id, username, avatarUrl }`

Utilisé sur la page Explore. Pourrait facilement être étendu à d'autres pages.

---

## 13. Navigation & UX

### Navbar persistante (sticky)
- Toujours visible en haut, fond `gray-900/95` avec backdrop-blur
- Logo OPTIQ → accueil
- Lien "Explorer" 🏆
- Si connecté : "Nouvelle Photo", cloche notifications, username (clic → profil), déconnexion
- Si non connecté : "Connexion", "Inscription"

### Liens cliquables vers les profils
- Auteur en bas de chaque `PhotoCard` (avec `e.preventDefault()` + `e.stopPropagation()` pour éviter le conflit avec le `<Link>` parent vers la photo)
- Auteur en haut de la page d'une photo
- Auteur de chaque critique
- Username dans la navbar
- Suggestions de la barre de recherche
- Liens des notifications

### Design
- Thème **sombre uniforme** (gray-900/800/700)
- Accent **indigo** pour les actions principales
- Icônes **Lucide React** partout
- **Tailwind 4** + transitions smooth
- Card alignment via `flex flex-col h-full` + `mt-auto` pour que les cartes aient toujours la même hauteur quel que soit le nombre de badges EXIF

### Confirmations destructives
- Suppression de photo : 2 clics (le premier passe en mode rouge "Confirmer la suppression")
- Suppression de critique : bouton × visible au survol uniquement
- Suppression d'annotation : clic direct sur la pastille colorée

---

## Récapitulatif des routes

### Frontend (React Router)

| Route | Page | Auth requise |
|---|---|---|
| `/` | Home (feed + filtres) | Non |
| `/explore` | Explore (top 7j + recherche) | Non |
| `/photo/:id` | Détail d'une photo | Non |
| `/profile/:id` | Profil public/privé | Non |
| `/login` | Connexion | Non |
| `/register` | Inscription | Non |
| `/upload` | Upload photo | Oui |
| `/settings` | Paramètres | Oui |

### Backend (NestJS)

Voir [`API.md`](./API.md) pour la liste complète.
