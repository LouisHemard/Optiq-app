# OPTIQ

Plateforme communautaire pour photographes : partage de photos, critiques visuelles annotées, système social complet (likes, follows, profils privés, notifications) et exploration des meilleures inspirations de la communauté.

---

## Sommaire

- [Aperçu](#aperçu)
- [Stack technique](#stack-technique)
- [Démarrage rapide](#démarrage-rapide)
- [Documentation détaillée](#documentation-détaillée)

---

## Aperçu

OPTIQ permet à un photographe de partager ses clichés avec leurs métadonnées techniques (EXIF), de recevoir des critiques visuelles précises grâce à un système d'annotations dessinées directement sur la photo, et d'évoluer dans une communauté avec un système d'abonnements, de likes et un Tableau d'Honneur hebdomadaire.

### Fonctionnalités clés

- Authentification sécurisée (JWT + bcrypt)
- Upload de photos avec extraction automatique des EXIF (`exifr`)
- Sélection manuelle de l'appareil photo (liste prédéfinie ou champ libre)
- Système de critiques avec annotations visuelles : **rectangles** ou **formes libres** (tracé à main levée simplifié et fermé en polygone)
- Jusqu'à **6 annotations colorées** par critique (rouge, vert, bleu, ambre, violet, rose)
- Système de **likes optimistes**
- Profils utilisateurs **publics ou privés**
- Système de **demandes d'abonnement** pour les profils privés
- **Notifications en temps réel** (cloche dans la navbar, badge des non-lues)
- **Filtres avancés** sur le feed (caméra, objectif, plage ISO)
- Page **Explore** : meilleures photos des 7 derniers jours
- Recherche d'utilisateurs en direct sur la page Explore
- Tooltips éducatifs sur chaque champ EXIF

---

## Stack technique

| Couche | Technologies |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind 4, React Router 7, Axios, Konva, Lucide |
| Backend | NestJS 11, Prisma 7, JWT, bcrypt, exifr, Multer |
| Base de données | PostgreSQL 16 (Docker) |
| Stockage images | Local (`/uploads`) avec fallback Supabase / Cloudinary |

---

## Démarrage rapide

### Prérequis

- Node.js 20+
- Docker Desktop
- npm

### Installation

```bash
# 1. Base de données PostgreSQL (Docker)
cd server
docker compose up -d

# 2. Backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
# → http://localhost:3002

# 3. Frontend (dans un autre terminal)
cd ../client
npm install
npm run dev
# → http://localhost:5173
```

### Variables d'environnement

Créer un fichier `server/.env` :

```env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5434/optiq"
JWT_SECRET="super-secret-key-change-me"
PORT=3002
```

---

## Documentation détaillée

| Fichier | Contenu |
|---|---|
| [`docs/FEATURES.md`](./docs/FEATURES.md) | Liste exhaustive des fonctionnalités utilisateur et leur fonctionnement |
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Architecture technique, organisation des modules, flux d'authentification |
| [`docs/API.md`](./docs/API.md) | Référence complète des endpoints REST |
| [`docs/DATABASE.md`](./docs/DATABASE.md) | Schéma Prisma détaillé avec relations |

---

## Licence

Projet de fin d'année — usage pédagogique.
