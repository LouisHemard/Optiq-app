# Manuel de mise à jour — OPTIQ

Ce document explique comment faire évoluer l'application : modifier le code, ajouter une fonctionnalité, mettre à jour les dépendances, faire une migration de base de données et déployer une nouvelle version en production.

---

## Sommaire

1. [Workflow de développement](#1-workflow-de-développement)
2. [Modifier le backend (NestJS)](#2-modifier-le-backend-nestjs)
3. [Modifier le frontend (React)](#3-modifier-le-frontend-react)
4. [Gérer la base de données (migrations Prisma)](#4-gérer-la-base-de-données-migrations-prisma)
5. [Mettre à jour les dépendances](#5-mettre-à-jour-les-dépendances)
6. [Déployer une nouvelle version](#6-déployer-une-nouvelle-version)
7. [Faire un rollback](#7-faire-un-rollback)
8. [Variables d'environnement](#8-variables-denvironnement)

---

## 1. Workflow de développement

Toute modification suit ce cycle, sans exception :

```
Modifier le code en local
        ↓
Tester en local (npm run test + npm run dev)
        ↓
Commit sur une branche
        ↓
git push → GitHub Actions vérifie (lint + tests + build)
        ↓
Si CI verte → merge sur main
        ↓
Déploiement automatique sur Render (backend) et Vercel (frontend)
```

**Règle principale : on ne pousse jamais directement sur `main` sans avoir vérifié que les tests passent.**

---

## 2. Modifier le backend (NestJS)

### Démarrer l'environnement local

```bash
# 1. Lancer la base de données PostgreSQL (Docker)
cd server
docker compose up -d

# 2. Démarrer le serveur en mode watch (rechargement automatique)
npm run start:dev
```

Le serveur écoute sur `http://localhost:3002`.

### Ajouter un endpoint

1. Créer ou modifier le contrôleur concerné dans `server/src/<module>/<module>.controller.ts`
2. Ajouter la logique métier dans `server/src/<module>/<module>.service.ts`
3. Si la route est protégée, ajouter le décorateur `@UseGuards(JwtAuthGuard)`
4. Mettre à jour les tests dans `<module>.service.spec.ts`
5. Tester manuellement avec curl ou un client HTTP

### Lancer les tests

```bash
cd server
npm run test          # tous les tests
npm run test:watch    # mode watch (relance à chaque sauvegarde)
npm run test:cov      # avec rapport de couverture
```

---

## 3. Modifier le frontend (React)

### Démarrer l'environnement local

```bash
cd client
npm run dev
```

Le frontend est accessible sur `http://localhost:5173`. Il pointe automatiquement vers `http://localhost:3002` pour l'API (variable `VITE_API_URL` dans `client/.env`).

### Ajouter une page

1. Créer le composant dans `client/src/pages/`
2. Ajouter la route dans `client/src/App.tsx`
3. Si la page nécessite une authentification, vérifier le token via `useContext(AuthContext)`

### Modifier l'URL de l'API

L'URL du backend est centralisée dans `client/src/services/api.ts` :

```ts
baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3002'
```

En local, elle est définie dans `client/.env`. En production sur Vercel, elle est définie dans les variables d'environnement du projet Vercel (`VITE_API_URL=https://optiq-backend-ex6o.onrender.com`).

### Builder pour la production

```bash
cd client
npm run build   # génère le dossier dist/
```

---

## 4. Gérer la base de données (migrations Prisma)

### Modifier le schéma

1. Éditer `server/prisma/schema.prisma`
2. Créer une migration :

```bash
cd server
npx prisma migrate dev --name nom_de_la_migration
```

Cette commande :
- Génère un fichier SQL dans `server/prisma/migrations/`
- Applique la migration sur la base locale
- Régénère le client Prisma typé

### Appliquer les migrations en production

Les migrations sont appliquées **automatiquement** au déploiement sur Render grâce à la commande de build :

```
npx prisma generate && npx prisma migrate deploy && npm run build
```

`migrate deploy` applique uniquement les migrations en attente, sans risque de perte de données.

### Inspecter la base en local

```bash
cd server
npx prisma studio   # ouvre une interface graphique sur http://localhost:5555
```

### Réinitialiser la base locale (développement uniquement)

```bash
cd server
npx prisma migrate reset   # ⚠ efface toutes les données locales
```

---

## 5. Mettre à jour les dépendances

### Vérifier les mises à jour disponibles

```bash
# Backend
cd server && npm outdated

# Frontend
cd client && npm outdated
```

### Mettre à jour une dépendance spécifique

```bash
npm install <package>@latest
```

### Vérifier les vulnérabilités de sécurité

```bash
npm audit
npm audit fix   # corrige automatiquement les vulnérabilités non-bloquantes
```

### Précautions importantes

- Ne jamais mettre à jour `prisma` et `@prisma/client` séparément — toujours les deux ensemble
- Après une mise à jour de Prisma, relancer `npx prisma generate`
- Tester toute la suite de tests après une mise à jour majeure (`npm run test`)
- Vérifier le build (`npm run build`) avant de pousser

---

## 6. Déployer une nouvelle version

### Déploiement automatique (recommandé)

C'est le chemin normal. Pousser sur `main` déclenche automatiquement :

1. **GitHub Actions** — lint + tests + build (vérification)
2. **Render** — redéploiement du backend via le deploy hook
3. **Vercel** — redéploiement du frontend (détecté automatiquement)

```bash
git add .
git commit -m "description de la modification"
git push origin main
```

Le déploiement prend environ **3 à 5 minutes** sur Render (le frontend Vercel est plus rapide, ~1 min).

### Suivre le déploiement

- **GitHub Actions** : https://github.com/LouisHemard/Optiq-app/actions
- **Render** : https://dashboard.render.com → service `optiq-backend` → onglet "Deploys"
- **Vercel** : https://vercel.com/dashboard → projet `optiq-app` → onglet "Deployments"

### Vérifier après déploiement

```bash
# Vérifier que le backend répond
curl https://optiq-backend-ex6o.onrender.com/

# Vérifier un endpoint authentifié (remplacer TOKEN)
curl -H "Authorization: Bearer TOKEN" https://optiq-backend-ex6o.onrender.com/notifications
```

---

## 7. Faire un rollback

### Via Render (backend)

1. Aller sur https://dashboard.render.com
2. Cliquer sur le service `optiq-backend`
3. Aller dans l'onglet **"Deploys"**
4. Trouver le dernier déploiement stable
5. Cliquer sur **"Redeploy"**

Render redéploie la version sélectionnée en quelques minutes.

### Via Vercel (frontend)

1. Aller sur https://vercel.com/dashboard
2. Cliquer sur le projet `optiq-app`
3. Aller dans **"Deployments"**
4. Trouver le dernier déploiement stable
5. Cliquer sur les **"..."** puis **"Promote to Production"**

### Via Git (si la cause du problème est dans le code)

```bash
# Revenir au commit précédent
git revert HEAD
git push origin main   # déclenche un nouveau déploiement automatique
```

`git revert` crée un nouveau commit qui annule les changements — c'est plus sûr que `git reset --hard` qui réécrit l'historique.

---

## 8. Variables d'environnement

### Backend (Render)

Les variables sont configurées dans le dashboard Render → service → onglet "Environment".

| Variable | Description |
|---|---|
| `DATABASE_URL` | URL de connexion Supabase (session pooler) |
| `JWT_SECRET` | Clé secrète pour signer les tokens JWT |
| `APP_URL` | URL publique du backend |
| `SENTRY_DSN` | DSN du projet Sentry pour le monitoring |
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_KEY` | Clé d'API Supabase (service role) |
| `NODE_ENV` | `production` |

### Frontend (Vercel)

Les variables sont configurées dans le dashboard Vercel → projet → "Settings" → "Environment Variables".

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL du backend (`https://optiq-backend-ex6o.onrender.com`) |

### En local

Copier les fichiers d'exemple et les remplir :

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**Les fichiers `.env` ne sont jamais commités** — ils sont dans `.gitignore`.
