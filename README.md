# OPTIQ

Plateforme communautaire pour photographes : partage de photos avec métadonnées EXIF, critiques visuelles annotées directement sur l'image, système social complet (likes, follows, profils privés, notifications) et exploration hebdomadaire des meilleures inspirations de la communauté.

---

## Sommaire

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Structure du projet](#structure-du-projet)
- [Démarrage rapide](#démarrage-rapide)
- [Variables d'environnement](#variables-denvironnement)
- [Déploiement](#déploiement)
- [Modèle de données](#modèle-de-données)

---

## Fonctionnalités

### Authentification & sécurité
- Inscription avec validation email (lien de vérification envoyé via Resend)
- Mot de passe : minimum 9 caractères, 1 chiffre, 1 caractère spécial (validé front et back)
- Connexion JWT (access token en mémoire)
- Réinitialisation de mot de passe par email
- Rate limiting global (100 req/min via `@nestjs/throttler`)
- Headers sécurisés (Helmet, HSTS, CSP)

### Photos
- Upload avec extraction automatique des métadonnées EXIF (`exifr`) : appareil, objectif, ISO, vitesse, ouverture, focale
- Sélection manuelle de l'appareil photo (liste de 90+ boîtiers ou champ libre)
- Protection des photos : URLs signées Supabase (expiration 1h) + watermark CSS et Konva
- Filtres avancés sur le feed : caméra, objectif, plage ISO, pagination

### Critiques visuelles
- Annotations dessinées sur la photo (Konva.js) : **rectangles** ou **formes libres** (polygone fermé automatiquement)
- Jusqu'à **6 annotations colorées** par critique (rouge, vert, bleu, ambre, violet, rose)
- Miniatures annotées dans la liste des critiques
- Texte de critique par annotation

### Social
- Likes optimistes (feedback instantané)
- Profils **publics ou privés** avec système de **demandes d'abonnement**
- Notifications en temps réel (badge de non-lues)
- Page **Explore** : top photos des 7 derniers jours, triées par votes Perfect + likes
- Vote **Perfect** (une seule fois par photo)
- Recherche d'utilisateurs en temps réel
- Suggestions d'abonnements (amis d'amis)

### UX
- Tooltips éducatifs sur chaque valeur EXIF
- Lightbox fullscreen
- Interface 100% dark mode

---

## Stack technique

| Couche | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, React Router 7, Axios, Konva / react-konva, Lucide React |
| **Backend** | NestJS 11, TypeScript 5.9, Prisma 7, Passport JWT, bcryptjs, Multer, exifr, Resend, Helmet, Throttler |
| **Base de données** | PostgreSQL 16 (Docker en dev) |
| **Stockage images** | Supabase Storage (prod) · local `/uploads` (dev) |
| **Monitoring** | Sentry (erreurs + profiling) |
| **CI/CD** | GitHub Actions → Render (backend) + Vercel (frontend) |

---

## Structure du projet

```
optiq-app/
├── client/                   # Frontend React / Vite
│   ├── src/
│   │   ├── components/       # PhotoCard, ReviewCanvas, Lightbox, ExifBadge…
│   │   ├── pages/            # Home, PhotoPage, ProfilePage, SettingsPage…
│   │   ├── context/          # AuthContext (JWT, état utilisateur)
│   │   ├── services/         # api.ts (Axios)
│   │   ├── types/            # Types partagés
│   │   └── utils/            # Parsing EXIF
│   └── .env.example
│
└── server/                   # Backend NestJS
    ├── src/
    │   ├── auth/             # JWT strategy, guards, décorateur CurrentUser
    │   ├── users/            # Profils, follows, password, notifications
    │   ├── photos/           # Upload, feed, explore, perfect, likes
    │   ├── reviews/          # Critiques avec annotations
    │   ├── annotations/      # CRUD annotations
    │   ├── notifications/    # Lecture, badge non-lues
    │   ├── storage/          # LocalStorageService + SupabaseStorageService
    │   ├── mail/             # Resend (vérification email, reset password)
    │   ├── prisma/           # PrismaService
    │   └── common/           # Intercepteur Sentry
    ├── prisma/
    │   ├── schema.prisma
    │   └── migrations/
    ├── docker-compose.yml    # PostgreSQL 16 en dev
    └── .env.example
```

---

## Démarrage rapide

### Prérequis

- Node.js 20+
- Docker Desktop (pour la base de données en dev)
- npm

### Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/LouisHemard/Optiq-app.git
cd Optiq-app

# 2. Base de données PostgreSQL
cd server
docker compose up -d
# → PostgreSQL disponible sur localhost:5434

# 3. Backend
cp .env.example .env          # puis remplir les variables
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
# → http://localhost:3002

# 4. Frontend (nouveau terminal)
cd ../client
cp .env.example .env          # puis remplir VITE_API_URL
npm install
npm run dev
# → http://localhost:5173
```

### Compte de test

| Champ | Valeur |
|---|---|
| Email | `test@optiq.fr` |
| Mot de passe | `Test1234!` |

---

## Variables d'environnement

### `server/.env`

```env
# Serveur
PORT=3002

# Base de données
DATABASE_URL=postgresql://myuser:mypassword@localhost:5434/optiq

# JWT — générer avec : openssl rand -base64 64
JWT_SECRET=change-this-to-a-strong-random-secret

# URL publique du backend (construit les URLs des images locales)
APP_URL=http://localhost:3002

# Stockage Supabase (optionnel — fallback sur /uploads si absent)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_BUCKET=Picture

# Email (optionnel — les emails sont skippés si absent)
RESEND_API_KEY=re_...
FRONTEND_URL=http://localhost:5173

# Monitoring (optionnel)
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
```

### `client/.env`

```env
VITE_API_URL=http://localhost:3002
```

---

## Déploiement

Le projet est configuré pour un déploiement automatique via `render.yaml` et `vercel.json`.

### Backend — Render

- Build : `npm ci && npx prisma generate && npx prisma migrate deploy && npm run build`
- Start : `npm run start:prod`
- Variables à configurer dans le dashboard Render : `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `SUPABASE_*`, `RESEND_API_KEY`, `FRONTEND_URL`, `SENTRY_DSN`

### Frontend — Vercel

- Build : `npm run build`
- Variable : `VITE_API_URL` → URL du backend Render

---

## Modèle de données

```
User ──< Photo ──< Review ──< Annotation
  │         └──< Like
  │         └──< UserPerfectVote
  └──< FollowRequest
  └──< Notification
```

| Modèle | Rôle |
|---|---|
| `User` | Compte photographe (profil, visibilité, follow) |
| `Photo` | Image uploadée avec métadonnées EXIF et compteurs |
| `Review` | Critique textuelle avec liste d'annotations visuelles |
| `Annotation` | Zone annotée sur la photo (type, couleur, points, texte) |
| `Like` | Like unique par utilisateur par photo |
| `UserPerfectVote` | Vote "Perfect" unique par utilisateur par photo |
| `FollowRequest` | Demande d'abonnement (profils privés) |
| `Notification` | Événement social (like, follow, critique…) |

---

## Licence

Projet de fin d'année M2 Expert Développement Web — Ynov — usage pédagogique.
