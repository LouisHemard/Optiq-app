# Manuel de déploiement — Intégration & Déploiement Continu (CI/CD)

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
         │ git push origin main
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
│  │           │ curl → Render    │               │    │
│  │           │   deploy hook    │               │    │
│  │           └──────────────────┘               │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  Production                                 │
│  Backend : Render (optiq-backend-ex6o)      │
│  Frontend : Vercel (optiq-app.vercel.app)   │
└─────────────────────────────────────────────┘
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
| **Tests** | `npm run test` | Exécute les **62 tests Jest** répartis sur 5 modules |

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

#### Déploiement réel via Render

```bash
curl -s "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

Le job envoie une requête HTTP au **deploy hook Render** (une URL secrète générée par Render). Render redémarre automatiquement le service backend, applique les migrations Prisma et recharge l'application.

La commande de build configurée sur Render est :

```bash
npx prisma generate && npx prisma migrate deploy && npm run build
```

`migrate deploy` applique les migrations SQL en attente sans risque de perte de données.

Le frontend est déployé automatiquement sur **Vercel** à chaque push sur `main`, indépendamment du pipeline GitHub Actions (Vercel détecte les changements directement via son intégration GitHub).

### 4.2 Secrets GitHub

Les credentials de déploiement sont stockés dans les **Secrets GitHub** (Settings → Secrets and variables → Actions) :

| Secret | Valeur |
|---|---|
| `RENDER_DEPLOY_HOOK` | URL du deploy hook Render (non-partageable) |

Les secrets sont **chiffrés** et **jamais visibles en clair** — même dans les logs des Actions.

---

## 5. Justification des choix techniques

### 5.1 Pourquoi GitHub Actions ?

| Critère | GitHub Actions | GitLab CI | Jenkins | CircleCI |
|---|---|---|---|---|
| Intégré au repo Git | Oui | Oui | Non | Non |
| Coût (open-source / public) | Gratuit | Gratuit | Gratuit (self-hosted) | Plan gratuit limité |
| Configuration as Code (YAML) | Oui | Oui | Groovy | Oui |
| Matrices de build | Oui | Oui | Oui | Oui |
| Marketplace d'actions | Énorme | Moyen | Plugins | Orbs |
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
- Les **62 tests Jest** s'exécutent à **chaque commit**
- Le **build TypeScript** valide le typage à chaque commit
- **Aucun deploy ne part sans CI verte** (`needs: [backend-ci, frontend-ci]`)
- **Détection précoce** : les bugs sont attrapés avant le merge, pas en production

### 5.3 Conformité Bloc 2

Le pipeline répond directement aux compétences du référentiel :

| Compétence Bloc 2 | Couverture |
|---|---|
| *"Définir un protocole d'intégration continue"* | Workflow `backend-ci` + `frontend-ci` |
| *"Définir un protocole de déploiement continu"* | Workflow `deploy` avec `needs` + Render deploy hook |
| *"Mettre en place un environnement de développement adapté"* | Cursor + Node 20 + Docker (section 1) |
| *"Vérifier la non-régression"* | 62 tests automatiques à chaque PR |
| *"Critères de qualité et de performance"* | Lighthouse + couverture de tests (section 5.4) |

### 5.4 Critères de qualité et de performance

#### Audit Lighthouse (production — mode navigation privée)

Rapport généré sur `https://optiq-app.vercel.app` via Chrome DevTools Lighthouse.

| Métrique | Score | Seuil |
|---|---|---|
| **Performance** | 75 / 100 | > 50 |
| **Accessibility** | 92 / 100 | > 90 |
| **Best Practices** | 100 / 100 | 100 |
| **SEO** | 91 / 100 | > 90 |

Le score de Performance de 75 est principalement impacté par le **First Contentful Paint (FCP)** — la première requête API vers le backend Render (plan gratuit) déclenche un cold start (~1-2 s) qui retarde l'affichage initial. Ce comportement est lié à l'hébergement gratuit et disparaîtrait avec un plan payant ou un backend toujours actif.

#### Bundle frontend (Vite — production)

```
dist/index.html                  0.49 kB │ gzip:   0.32 kB
dist/assets/index.css           29.35 kB │ gzip:   6.20 kB
dist/assets/index.js           647.50 kB │ gzip: 198.82 kB
✓ built in 681 ms
```

Le bundle JS de 647 kB (198 kB gzippé) intègre React, Konva (canvas annotations), Axios et l'ensemble des composants. C'est dans la norme pour une SPA avec des librairies graphiques.

#### Qualité du code

| Outil | Résultat |
|---|---|
| **ESLint** | 0 erreur — vérifié à chaque commit par la CI |
| **TypeScript** | Compilation sans erreur — vérifiée par le build Vite |
| **Jest** | 81 tests, 70.87 % de couverture de lignes |

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
      - run: npm run test                      # 62 tests Jest

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
    needs: [backend-ci, frontend-ci]           # bloqueur : CI doit être verte
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    steps:
      - name: Déclencher le déploiement Render
        run: curl -s "${{ secrets.RENDER_DEPLOY_HOOK }}"
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
- [ ] **Rollback automatique** en cas d'erreur post-déploiement (via Sentry alerts)

### 7.3 Long terme

- [ ] **Environnement de staging** auto-provisionné à chaque PR (preview environments)
- [ ] **Tests de performance** (k6 ou Artillery)
- [ ] **Scans de sécurité** (Snyk, Trivy sur les images Docker)

---

## 8. Discours pour le jury

> "Pour répondre aux exigences du Bloc 2 sur l'intégration et le déploiement continus, j'ai mis en place un pipeline GitHub Actions structuré en **trois séquences**.
>
> **Côté environnement de développement**, j'ai choisi **Cursor** comme IDE — qui est une déclinaison de VS Code optimisée pour les workflows IA — avec **Node.js 20 LTS** comme runtime et **Docker Desktop** pour conteneuriser PostgreSQL en local. Ce choix garantit un environnement reproductible identique entre tous les développeurs et entre dev / CI / production.
>
> **Le pipeline CI/CD** s'exécute automatiquement à chaque push ou pull request sur la branche `main`. Il est composé de :
>
> 1. Une **séquence d'intégration backend** qui clone le code, installe les dépendances avec `npm ci` pour garantir le déterminisme, génère le client Prisma, lance ESLint et exécute les **62 tests Jest** répartis sur cinq modules métier : Auth, Users, Photos, Reviews et Annotations.
>
> 2. Une **séquence d'intégration frontend** qui fait la même chose côté React : install, lint, et un build complet via Vite + TypeScript pour vérifier qu'il n'y a aucune erreur de typage.
>
> 3. Une **séquence de déploiement continu** qui n'est exécutée **que si les deux séquences précédentes sont vertes** — c'est le mécanisme `needs` de GitHub Actions — et **uniquement sur push direct sur main**, pas sur les pull requests. Elle appelle le **deploy hook Render** via une simple requête curl, ce qui déclenche le redémarrage du backend en production, avec les migrations Prisma appliquées automatiquement.
>
> Ce design garantit trois propriétés essentielles : **automatisation** — aucun humain ne peut oublier les tests, **sécurité** — les secrets sont chiffrés et la branche `main` est protégée, et **non-régression** — chaque commit est validé contre les 62 tests existants avant d'arriver en production."

---

## Annexes

### Fichier de configuration

- [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) — Le pipeline complet (~85 lignes YAML)

### Lecture du statut sur GitHub

Une fois le repo poussé, chaque PR affiche en bas de page le statut des jobs :

```
Backend — Lint & Tests        — passed in 45s
Frontend — Lint & Build       — passed in 32s
Déploiement Production        — passed in 4s
```

Si l'un des jobs échoue, le merge est **bloqué** automatiquement (à condition d'avoir activé "Require status checks to pass" dans Settings → Branches → Protection rules).

### Commandes utiles

```bash
# Voir l'historique des runs
gh run list --workflow=ci-cd.yml

# Re-déclencher un run échoué
gh run rerun <run-id>

# Déclencher manuellement un déploiement Render
curl -s "$RENDER_DEPLOY_HOOK"
```

### Références

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Deploy Hooks](https://docs.render.com/deploy-hooks)
- ISO/IEC 12207 — Software life cycle processes
- *Continuous Delivery* — Jez Humble & David Farley
