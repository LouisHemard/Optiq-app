# Intégration & Déploiement Continu (CI/CD)

Compte-rendu pédagogique pour la soutenance (Bloc 2) — Démontrer la mise en place d'un protocole **d'intégration continue** et de **déploiement continu** automatisé via GitHub Actions.

---

## Sommaire

1. [Environnement de développement](#1-environnement-de-développement)
2. [Vue d'ensemble du pipeline](#2-vue-densemble-du-pipeline)
3. [Séquences d'intégration](#3-séquences-dintégration)
4. [Séquence de déploiement](#4-séquence-de-déploiement)
5. [Justification des choix techniques](#5-justification-des-choix-techniques)
6. [Fichier `ci-cd.yml` commenté](#6-fichier-ci-cdyml-commenté)
7. [Évolutions prévues](#7-évolutions-prévues)
8. [Discours pour le jury](#8-discours-pour-le-jury)

---

## 1. Environnement de développement

### 1.1 Outils du poste développeur

| Catégorie | Outil retenu | Version | Rôle |
|---|---|---|---|
| **IDE** | Cursor (basé sur VS Code) | 1.x | Éditeur de code, intégration IA, terminal intégré |
| **Runtime** | Node.js | 20 LTS | Exécution JS/TS côté serveur (NestJS) et build (Vite) |
| **Gestionnaire de paquets** | npm | 10.x | Lock-file `package-lock.json` versionné |
| **Conteneurisation** | Docker Desktop | 4.x | Isolation de PostgreSQL en local |
| **Base de données locale** | PostgreSQL 16 | via Docker | Identique à la prod, port 5434 |
| **Versioning** | Git + GitHub | — | Historique, revue de code via Pull Request |
| **Test runner** | Jest | 30 | Tests unitaires NestJS |
| **Build tool frontend** | Vite | 8 | Bundler de production rapide |
| **Linter** | ESLint | 9 | Cohérence du code |
| **Formatter** | Prettier | 3 | Formatage uniforme |

### 1.2 Pourquoi cet environnement ?

- **VS Code / Cursor** : standard du marché, support TypeScript de premier ordre, écosystème d'extensions
- **Node.js 20 LTS** : version Long-Term Support, supportée par tous les outils de l'écosystème
- **Docker pour PostgreSQL** : permet à n'importe quel dev de cloner et démarrer la base sans rien installer sur sa machine — *"if it works in Docker, it works on the CI"*
- **GitHub** : hébergement Git + CI/CD + revue de code dans un seul outil, pas de coût supplémentaire

### 1.3 Reproductibilité

```bash
# Clone et démarrage en 4 commandes
git clone <repo>
cd optiq-app/server && docker compose up -d   # PostgreSQL
cd ../server && npm install && npm run start:dev
cd ../client && npm install && npm run dev
```

Ce script fonctionne identiquement sur **macOS / Linux / Windows** grâce à Docker et Node.js multiplateformes.

---

## 2. Vue d'ensemble du pipeline

```
┌─────────────────┐
│  Développeur    │
│  (Cursor / VS)  │
└────────┬────────┘
         │ git push origin feature/xxx
         │ ouvre une Pull Request
         ▼
┌──────────────────────────────────────────────────────┐
│                   GitHub                             │
│  ┌──────────────────────────────────────────────┐    │
│  │  Workflow GitHub Actions (ci-cd.yml)         │    │
│  │                                              │    │
│  │  ┌─────────────────┐   ┌──────────────────┐  │    │
│  │  │ Job 1           │   │ Job 2            │  │    │
│  │  │ backend-ci      │   │ frontend-ci      │  │    │
│  │  │                 │   │                  │  │    │
│  │  │ - npm ci        │   │ - npm ci         │  │    │
│  │  │ - prisma gen    │   │ - npm run lint   │  │    │
│  │  │ - npm run lint  │   │ - npm run build  │  │    │
│  │  │ - npm run test  │   │                  │  │    │
│  │  └────────┬────────┘   └────────┬─────────┘  │    │
│  │           │  (parallèles)       │            │    │
│  │           └─────────┬───────────┘            │    │
│  │                     ▼                        │    │
│  │           ┌──────────────────┐               │    │
│  │           │ Job 3 (deploy)   │               │    │
│  │           │ if push on main  │               │    │
│  │           │ needs: 1 + 2     │               │    │
│  │           │                  │               │    │
│  │           │ - simulation     │               │    │
│  │           │   echo "Déploi.."│               │    │
│  │           └──────────────────┘               │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
         │
         ▼  (en production réelle)
┌─────────────────┐
│  Production     │
│  (Render / VPS) │
└─────────────────┘
```

### Déclencheurs (`triggers`)

| Événement | Action |
|---|---|
| `push` sur `main` | CI complète + déploiement |
| `pull_request` ciblant `main` | CI seule (pas de déploiement) |

Cette distinction garantit que **aucun code non revu ne peut atteindre la production**.

---

## 3. Séquences d'intégration

> **Définition** : l'intégration continue (CI) regroupe les étapes automatisées qui valident chaque commit avant qu'il n'atteigne la production. Elle évite la régression et la divergence entre développeurs.

### 3.1 Cycle de vie d'un commit

```
   Code         Push           Tests auto         Build           Merge
    │            │                │                │                │
    ▼            ▼                ▼                ▼                ▼
[Cursor]──▶[git push]──▶[GitHub Actions]──▶[Vite/tsc]──▶[main protégée]
              │              │      │            │             │
              │              │      │            │             │
            origin       Lint    Tests        Bundle      Code review
                       (ESLint) (Jest)        (Vite)     (Pull Request)
```

### 3.2 Job 1 — `backend-ci`

| Étape | Commande | Objectif |
|---|---|---|
| **Checkout** | `actions/checkout@v4` | Récupère le code source |
| **Setup Node** | `actions/setup-node@v4` (cache npm activé) | Installe Node 20 + cache `~/.npm` |
| **Install** | `npm ci` | Installation déterministe via `package-lock.json` |
| **Prisma** | `npx prisma generate` | Génère le client Prisma typé |
| **Lint** | `npm run lint` | Vérifie les règles ESLint |
| **Tests** | `npm run test` | Exécute les **15 tests Jest** (dont les 6 d'AuthService) |

**Durée typique** : ~45 s grâce au cache npm.

### 3.3 Job 2 — `frontend-ci`

| Étape | Commande | Objectif |
|---|---|---|
| **Checkout** | `actions/checkout@v4` | Récupère le code source |
| **Setup Node** | `actions/setup-node@v4` (cache npm) | Node 20 |
| **Install** | `npm ci` | Installation déterministe |
| **Lint** | `npm run lint` | Vérifie ESLint sur React + TS |
| **Build** | `npm run build` | Compile TypeScript + bundle Vite |

> Si le build échoue (erreur TS, dépendance cassée, etc.), le job échoue et le merge est bloqué.

**Durée typique** : ~30 s.

### 3.4 Parallélisation

Les jobs **`backend-ci`** et **`frontend-ci`** s'exécutent en **parallèle** sur deux runners distincts. Cela divise le temps total par deux par rapport à un workflow séquentiel.

---

## 4. Séquence de déploiement

### 4.1 Job 3 — `deploy`

```yaml
deploy:
  needs: [backend-ci, frontend-ci]
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

#### Conditions de déclenchement

1. **`needs: [backend-ci, frontend-ci]`** — n'exécute le déploiement **que si les deux jobs CI ont réussi**. Un seul échec = pas de déploiement.
2. **`if: ... 'refs/heads/main'`** — n'exécute **que sur push direct sur `main`**, pas sur les Pull Requests.

#### Comportement actuel (simulation)

```bash
echo "Déploiement de la version en production..."
echo "Commit       : ${{ github.sha }}"
echo "Branche      : ${{ github.ref_name }}"
echo "1/4 - Build des images Docker..."
echo "2/4 - Push vers le registry..."
echo "3/4 - Migrations Prisma sur PostgreSQL prod..."
echo "4/4 - Bascule du trafic..."
```

### 4.2 En production réelle (évolution)

Pour passer à un vrai déploiement, on remplacerait le script bash par :

```yaml
- name: Build & push Docker image
  run: |
    docker build -t registry.optiq.io/api:${{ github.sha }} ./server
    docker push registry.optiq.io/api:${{ github.sha }}

- name: Deploy on Render / Fly.io / VPS
  uses: render-actions/deploy@v1
  with:
    service-id: ${{ secrets.RENDER_SERVICE_ID }}
    api-key: ${{ secrets.RENDER_API_KEY }}

- name: Migrations Prisma
  run: npx prisma migrate deploy
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL_PROD }}
```

Les `secrets` GitHub permettent de stocker les credentials de manière chiffrée — **jamais en clair dans le code**.

---

## 5. Justification des choix techniques

### 5.1 Pourquoi GitHub Actions ?

| Critère | GitHub Actions | GitLab CI | Jenkins | CircleCI |
|---|---|---|---|---|
| Intégré au repo Git | ✅ | ✅ | ❌ | ❌ |
| Coût (open-source / public) | Gratuit | Gratuit | Gratuit (self-hosted) | Plan gratuit limité |
| Configuration as Code (YAML) | ✅ | ✅ | ⚠ Groovy | ✅ |
| Matrices de build | ✅ | ✅ | ✅ | ✅ |
| Marketplace d'actions | **Énorme** | Moyen | Plugins | Orbs |
| Maturité 2026 | Standard de fait | — | Vieillissant | — |

GitHub Actions a été retenu pour la **simplicité d'intégration** (le projet est déjà sur GitHub), la **gratuité** pour les projets publics, et l'écosystème d'actions réutilisables.

### 5.2 Pourquoi automatiser ?

#### Automatisation
- **Élimine l'erreur humaine** : impossible de "oublier" de lancer les tests
- **Reproductibilité** : la machine GitHub est identique à chaque exécution
- **Feedback rapide** : un développeur sait en 1 minute si son commit casse quelque chose

#### Sécurité
- **Aucun secret dans le code source** : `${{ secrets.* }}` chiffrés par GitHub
- **Branche `main` protégée** : impossible de push sans review + CI verte
- **Isolation** : les runners GitHub sont jetables, aucune contamination d'un build à l'autre
- **Audit trail** : chaque exécution est tracée avec auteur, commit, durée, logs

#### Non-régression
- Les **15 tests Jest** s'exécutent à **chaque commit**
- Le **build TypeScript** valide le typage à chaque commit
- **Aucun deploy ne part sans CI verte** (`needs: [backend-ci, frontend-ci]`)
- **Détection précoce** : les bugs sont attrapés avant le merge, pas en production

### 5.3 Conformité Bloc 2

Le pipeline répond directement aux compétences du référentiel :

| Compétence Bloc 2 | Couverture |
|---|---|
| *"Définir un protocole d'intégration continue"* | Workflow `backend-ci` + `frontend-ci` |
| *"Définir un protocole de déploiement continu"* | Workflow `deploy` avec `needs` |
| *"Mettre en place un environnement de développement adapté"* | Cursor + Node 20 + Docker (section 1) |
| *"Vérifier la non-régression"* | Tests automatiques à chaque PR |

---

## 6. Fichier `ci-cd.yml` commenté

```yaml
name: CI/CD — OPTIQ

# Déclencheurs : push sur main + PR ciblant main
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # ─── SÉQUENCE 1 : INTÉGRATION BACKEND ─────────────────────
  backend-ci:
    name: Backend — Lint & Tests
    runs-on: ubuntu-latest                     # runner Linux GitHub
    defaults:
      run:
        working-directory: ./server            # toutes les commandes dans server/
    steps:
      - uses: actions/checkout@v4              # clone le repo

      - uses: actions/setup-node@v4            # Node 20 + cache npm
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: server/package-lock.json

      - run: npm ci                            # install déterministe
      - run: npx prisma generate               # client Prisma typé
      - run: npm run lint                      # ESLint
      - run: npm run test                      # 15 tests Jest

  # ─── SÉQUENCE 2 : INTÉGRATION FRONTEND ────────────────────
  frontend-ci:
    name: Frontend — Lint & Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./client
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: client/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build                     # tsc + Vite bundle

  # ─── SÉQUENCE 3 : DÉPLOIEMENT CONTINU ─────────────────────
  deploy:
    name: Déploiement Production
    runs-on: ubuntu-latest
    needs: [backend-ci, frontend-ci]           # ⚠ bloqueur : CI doit être verte
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: |
          echo "Déploiement de la version en production..."
          # ... script de simulation ...
```

---

## 7. Évolutions prévues

### 7.1 Court terme

- [ ] Ajouter un job de **couverture de code** (`npm run test:cov` + Codecov)
- [ ] Activer **Dependabot** pour les mises à jour automatiques de dépendances
- [ ] Ajouter `npm audit --audit-level=high` pour bloquer les vulnérabilités critiques
- [ ] Brancher **Sentry releases** : créer une release Sentry à chaque deploy

### 7.2 Moyen terme

- [ ] Tests **end-to-end** Playwright sur le frontend
- [ ] **Matrice de build** Node 18 / 20 / 22 pour anticiper les EOL
- [ ] **Déploiement réel** vers Render.com / Fly.io / VPS
- [ ] **Rollback automatique** en cas d'erreur post-déploiement (via Sentry alerts)

### 7.3 Long terme

- [ ] **Environnement de staging** auto-provisionné à chaque PR (preview environments)
- [ ] **Tests de performance** (k6 ou Artillery)
- [ ] **Scans de sécurité** (Snyk, Trivy sur les images Docker)

---

## 8. Discours pour le jury

> "Pour répondre aux exigences du Bloc 2 sur l'intégration et le déploiement continus, j'ai mis en place un pipeline GitHub Actions structuré en **trois séquences**.
>
> **Côté environnement de développement**, j'ai choisi **Cursor** comme IDE — qui est une déclinaison de VS Code optimisée pour les workflows IA — avec **Node.js 20 LTS** comme runtime et **Docker Desktop** pour conteneuriser PostgreSQL en local. Ce choix garantit une environnement reproductible identique entre tous les développeurs et entre dev / CI / production.
>
> **Le pipeline CI/CD** s'exécute automatiquement à chaque push ou pull request sur la branche `main`. Il est composé de :
>
> 1. Une **séquence d'intégration backend** qui clone le code, installe les dépendances avec `npm ci` pour garantir le déterminisme, génère le client Prisma, lance ESLint et exécute les 15 tests Jest dont les 6 tests métier d'`AuthService`.
>
> 2. Une **séquence d'intégration frontend** qui fait la même chose côté React : install, lint, et un build complet via Vite + TypeScript pour vérifier qu'il n'y a aucune erreur de typage.
>
> 3. Une **séquence de déploiement continu** qui n'est exécutée **que si les deux séquences précédentes sont vertes** — c'est le mécanisme `needs` de GitHub Actions — et **uniquement sur push direct sur main**, pas sur les pull requests.
>
> Ce design garantit trois propriétés essentielles : **automatisation** — aucun humain ne peut oublier les tests, **sécurité** — les secrets sont chiffrés et la branche `main` est protégée, et **non-régression** — chaque commit est validé contre la suite de tests existante avant d'arriver en production.
>
> Pour l'instant, le job de déploiement est une **simulation** qui affiche les étapes (`echo`), mais le pipeline est prêt à être connecté à un fournisseur cloud comme Render ou Fly.io en remplaçant le script bash par une action de déploiement."

---

## Annexes

### Fichier de configuration

- [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) — Le pipeline complet (~85 lignes YAML)

### Lecture du statut sur GitHub

Une fois le repo poussé, chaque PR affiche en bas de page le statut des jobs :

```
✅ Backend — Lint & Tests        — passed in 45s
✅ Frontend — Lint & Build       — passed in 32s
✅ Déploiement Production        — passed in 4s
```

Si l'un des jobs échoue, le merge est **bloqué** automatiquement (à condition d'avoir activé "Require status checks to pass" dans Settings → Branches → Protection rules).

### Commandes utiles

```bash
# Tester le workflow localement avec act
brew install act
act push -j backend-ci

# Voir l'historique des runs
gh run list --workflow=ci-cd.yml

# Re-déclencher un run échoué
gh run rerun <run-id>
```

### Références

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Awesome Actions](https://github.com/sdras/awesome-actions)
- ISO/IEC 12207 — Software life cycle processes
- *Continuous Delivery* — Jez Humble & David Farley
