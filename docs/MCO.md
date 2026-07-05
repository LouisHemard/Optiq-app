# Maintien en Condition Opérationnelle (MCO) — Stratégie de supervision

Compte-rendu pédagogique pour la soutenance (Bloc 4) — Démontrer que **le système de supervision est adapté** et que **le processus de collecte des anomalies est structuré**.

> **Outil de supervision retenu** : [Sentry](https://sentry.io)
> **Type de supervision** : APM (Application Performance Monitoring) + Error Tracking

---

## Sommaire

1. [Pourquoi Sentry ?](#1-pourquoi-sentry-)
2. [Architecture de supervision](#2-architecture-de-supervision)
3. [Sentry comme sonde de collecte](#3-sentry-comme-sonde-de-collecte)
4. [Processus de traitement d'une anomalie](#4-processus-de-traitement-dune-anomalie)
5. [Fiche de consignation type](#5-fiche-de-consignation-type)
6. [Indicateurs de qualité (KPI)](#6-indicateurs-de-qualité-kpi)
7. [Maintenance préventive vs corrective](#7-maintenance-préventive-vs-corrective)
8. [Discours pour le jury](#8-discours-pour-le-jury)

---

## 1. Pourquoi Sentry ?

| Critère | Justification |
|---|---|
| **Industrie standard** | Utilisé par GitHub, Atlassian, Cloudflare, Reddit… |
| **Plan gratuit suffisant** | 5 000 events/mois → couvre largement un projet étudiant ou MVP |
| **Intégration NestJS native** | SDK officiel `@sentry/node` + `@sentry/profiling-node` |
| **Stack trace exploitable** | Source maps, breadcrumbs, contexte complet de la requête |
| **Alerting intégré** | Email, Slack, Discord, PagerDuty selon la criticité |
| **Conformité RGPD** | Hébergement EU disponible, scrubbing automatique des données sensibles |

**Alternatives évaluées** : Datadog (cher), New Relic (cher), Rollbar (moins riche), self-hosted GlitchTip (coût opérationnel).

---

## 2. Architecture de supervision

```
┌──────────────┐       (1) Erreur 5xx ou exception non gérée
│  Utilisateur │ ─────────────────────────────────────────┐
└──────┬───────┘                                          ▼
       │                                          ┌──────────────┐
       │ HTTP requête                             │  Intercepteur│
       ▼                                          │   Sentry     │
┌──────────────┐                                  │  (NestJS)    │
│  API NestJS  │ ────── catch error ──────────────│              │
│  (Port 3001) │                                  └──────┬───────┘
└──────────────┘                                         │
                                                  (2) captureException()
                                                         │
                                                         ▼
                                              ┌─────────────────────┐
                                              │   Sentry Cloud      │
                                              │   (sentry.io)       │
                                              │                     │
                                              │ • Stack trace       │
                                              │ • Breadcrumbs       │
                                              │ • Contexte requête  │
                                              │ • Profiling CPU     │
                                              └──────────┬──────────┘
                                                         │
                                                  (3) Alerting
                                                         │
                              ┌──────────────────────────┼──────────────────────┐
                              ▼                          ▼                      ▼
                       ┌─────────────┐           ┌─────────────┐        ┌─────────────┐
                       │   Email     │           │   Slack /   │        │ Dashboard   │
                       │ (dev team)  │           │  Discord    │        │  Sentry     │
                       └─────────────┘           └─────────────┘        └─────────────┘
```

---

## 3. Sentry comme sonde de collecte

### 3.1 Initialisation au démarrage (`main.ts`)

```ts
Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://public@sentry.example.com/1',
  environment: process.env.NODE_ENV || 'development',
  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,    // 100% des requêtes profilées (à réduire en prod)
  profilesSampleRate: 1.0,  // 100% des transactions profilées
});
```

### 3.2 Intercepteur global (`sentry.interceptor.ts`)

Au lieu de scatter des `try/catch` un peu partout, on a un **intercepteur unique** enregistré comme `APP_INTERCEPTOR` dans `AppModule`. Il s'exécute **autour de chaque route HTTP** et :

1. Laisse passer la requête normalement
2. Si une exception est levée → la **filtre** :
   - **HTTP 5xx ou exception non typée** → remonte vers Sentry avec contexte enrichi
   - **HTTP 4xx (401, 403, 404, 422…)** → ignorée (erreur métier, pas un bug)
3. Re-lance l'erreur via `throwError(() => error)` pour que NestJS continue le pipeline normal

```ts
private shouldReport(error: unknown): boolean {
  if (error instanceof HttpException) {
    return error.getStatus() >= 500;  // uniquement les 500+
  }
  return true;  // toute exception non-HTTP est suspecte
}
```

### 3.3 Pourquoi filtrer les 4xx ?

| Cas | Statut | Doit-on alerter ? |
|---|---|---|
| Mot de passe incorrect | 401 | Non — comportement normal |
| Photo inexistante | 404 | Non — l'utilisateur a tapé un mauvais ID |
| Accès non autorisé | 403 | Non — sécurité fonctionnant correctement |
| Validation DTO | 400 | Non — l'utilisateur a mal saisi |
| Trop de requêtes | 429 | Non — Throttler fait son travail |
| **Crash interne** | **500** | **Oui — bug à corriger** |
| **Erreur DB** | **500/502** | **Oui — incident infra** |
| **Out of memory** | **non typé** | **Oui — incident critique** |

Sans ce filtrage, on **noierait** les vrais bugs sous des milliers d'alertes 401 quand un utilisateur se trompe de mot de passe.

### 3.4 Contexte enrichi remonté à Sentry

Pour chaque erreur reportée, l'intercepteur joint :

```ts
{
  method: 'POST',                     // Méthode HTTP
  url: '/photos',                     // Endpoint impacté
  ip: '82.123.45.67',                 // IP du client
  userId: 'uuid-de-utilisateur',      // ID utilisateur connecté (si JWT présent)
  userAgent: 'Mozilla/5.0...',        // Navigateur / app
}
```

Avec ces métadonnées, on peut **reproduire** le bug sans avoir à demander à l'utilisateur ce qu'il faisait.

---

## 4. Processus de traitement d'une anomalie

Le processus suit un workflow **structuré et reproductible** que l'on peut tracer pour le RGPD et la qualité.

```
┌─────────────────────┐
│  1. DÉTECTION       │  Sentry capture l'exception
│  (automatique)      │  → Issue créée dans le dashboard
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  2. ALERTE          │  Notification email + Slack
│  (temps réel)       │  → Le dev de garde est prévenu
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  3. CONSIGNATION    │  Création d'un ticket GitHub Issue
│  (qualité)          │  → Modèle "fiche d'anomalie" rempli
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  4. TRIAGE          │  Niveau de criticité défini
│  (priorisation)     │  → P1 (bloquant) / P2 (majeur) / P3 (mineur)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  5. ANALYSE         │  Reproduction locale + diagnostic
│  (investigation)    │  → Stack trace + breadcrumbs Sentry
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  6. CORRECTIF       │  Branch hotfix + tests unitaires
│  (développement)    │  → Pull Request reviewée
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  7. DÉPLOIEMENT     │  CI/CD → staging → production
│  (release)          │  → Sentry release tag activé
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  8. VÉRIFICATION    │  Marquer l'issue Sentry comme "Resolved"
│  (clôture)          │  → Si réapparaît → ré-ouverture auto
└─────────────────────┘
```

### Niveaux de criticité (SLA cible)

| Niveau | Définition | SLA correctif |
|---|---|---|
| **P1 — Bloquant** | API down, perte de données | 2 h |
| **P2 — Majeur** | Fonctionnalité cassée pour ≥ 10 % users | 24 h |
| **P3 — Mineur** | Bug isolé, contournement possible | 7 jours |
| **P4 — Cosmétique** | UI / typo / log non critique | Backlog |

---

## 5. Fiche de consignation type

Chaque anomalie remontée par Sentry **doit** être consignée dans un ticket suivant ce template, pour la traçabilité et la conformité.

```markdown
# [BUG] Crash 500 lors de l'upload d'image

## 🔍 Identifiant Sentry
- Issue ID : `OPTIQ-API-42`
- Lien : https://sentry.io/organizations/optiq/issues/42/
- Première occurrence : 2026-04-29 14:32:11 UTC
- Nombre d'occurrences : 17
- Utilisateurs impactés : 4

## 🌍 Environnement
- Service : `optiq-api` (NestJS 11)
- Endpoint : `POST /photos`
- Version : `v1.4.2`
- Environnement : `production`

## 📋 Description
Lors de l'upload d'une image > 30 Mo, l'API renvoie une 500 sans message clair.

## 🧪 Étapes de reproduction
1. Se connecter avec un compte utilisateur
2. Aller sur `/upload`
3. Sélectionner une photo > 30 Mo (au format RAW par exemple)
4. Cliquer sur "Publier la photo"

## 💥 Comportement observé
```
TypeError: Cannot read property 'buffer' of undefined
  at PhotosService.create (photos.service.ts:42:18)
  at ...
```

## ✅ Comportement attendu
Soit l'upload réussit, soit un message clair "Fichier trop volumineux".

## 🩹 Hypothèse de correction
Vérifier le ratio entre la limite Multer (50 Mo) et la limite de mémoire Node.

## 🏷️ Métadonnées
- Sévérité : **P2 - Majeur**
- Assigné : @louis
- Branche : `hotfix/upload-large-file`
- Pull Request : #87
- Date de résolution prévue : 2026-04-30
```

---

## 6. Indicateurs de qualité (KPI)

Suivis directement dans le dashboard Sentry pour mesurer la **qualité opérationnelle** :

| KPI | Cible | Mesure |
|---|---|---|
| **Crash-Free Rate** | > 99,5 % | % de sessions sans erreur 5xx |
| **MTTD** (Mean Time To Detect) | < 5 min | Délai entre l'erreur et la notification dev |
| **MTTR** (Mean Time To Resolve) | < 24 h pour P2 | Délai notification → résolution |
| **Volume d'erreurs / 24h** | < 50 | Indicateur de santé global |
| **Issues nouvelles vs récurrentes** | < 30 % nouvelles | Mesure de la régression |
| **Performance p95** | < 500 ms | Latence des endpoints |

---

## 7. Maintenance préventive vs corrective

### 7.1 Préventive (avant que ça casse)

| Action | Fréquence | Outil |
|---|---|---|
| `npm audit` (vulnérabilités dépendances) | Hebdomadaire | npm + Dependabot |
| Tests unitaires automatisés | À chaque PR | Jest |
| Revue du dashboard Sentry | Quotidienne | Sentry |
| Review de la croissance de la BDD | Mensuelle | Prisma Studio + métriques |
| Sauvegardes PostgreSQL | Quotidienne (rétention 30j) | Cron + pg_dump |
| Mise à jour des paquets npm | Mensuelle | `npm outdated` |

### 7.2 Corrective (quand ça casse)

Voir [section 4](#4-processus-de-traitement-dune-anomalie) — pilotée par Sentry.

### 7.3 Évolutive

Les retours utilisateurs sont collectés via :
- Le système de notifications de l'app (notifications de bug)
- Sentry User Feedback (widget de retour utilisateur)
- GitHub Issues publiques

---

## 8. Discours pour le jury

> "Pour le maintien en condition opérationnelle de mon application, j'ai mis en place une **stratégie de supervision basée sur Sentry**, qui est l'outil standard de l'industrie pour le monitoring d'applications.
>
> Concrètement, j'ai intégré le SDK `@sentry/node` au démarrage de mon API NestJS, et j'ai créé un **intercepteur global** qui s'exécute autour de chaque requête HTTP. Cet intercepteur agit comme une **sonde** : il capture toutes les erreurs serveur (5xx) et les exceptions non maîtrisées, mais il **filtre intentionnellement les erreurs métier 4xx** comme les 401 ou les 404, parce que ce sont des comportements normaux qui ne doivent pas polluer la supervision.
>
> Quand une erreur passe le filtre, l'intercepteur appelle `Sentry.captureException()` en y attachant un **contexte enrichi** : la méthode HTTP, l'URL, l'IP, l'identifiant de l'utilisateur connecté et le user agent. Ces métadonnées me permettent de reproduire le bug sans avoir à interroger l'utilisateur.
>
> Côté **processus de collecte**, j'ai défini un workflow structuré en 8 étapes : détection automatique par Sentry → alerte par email/Slack → consignation dans une fiche d'anomalie standardisée → triage par criticité (P1 bloquant à P4 cosmétique) → analyse → correctif avec test unitaire → déploiement → vérification.
>
> Pour mesurer la qualité, je suis des **KPIs** comme le Crash-Free Rate (cible > 99,5 %), le MTTD et le MTTR (Mean Time To Detect / Resolve).
>
> Cette approche me permet à la fois de répondre au critère **'système de supervision adapté'** — Sentry est l'outil de référence et il est correctement configuré pour mon contexte — et au critère **'processus de collecte structuré'** — j'ai un pipeline clair de la détection à la résolution, avec une fiche de consignation type pour la traçabilité."

---

## Annexes

### Variables d'environnement

```env
# server/.env
SENTRY_DSN="https://<your_public_key>@<your_org>.ingest.sentry.io/<project_id>"
NODE_ENV="production"
```

> Pour obtenir un DSN réel : créer un projet sur [sentry.io](https://sentry.io) → Settings → Client Keys (DSN). En l'absence de DSN, le code utilise une valeur factice qui n'envoie rien.

### Fichiers techniques

- [`server/src/main.ts`](../server/src/main.ts) — `Sentry.init(...)` au tout début de `bootstrap()`
- [`server/src/app.module.ts`](../server/src/app.module.ts) — Enregistrement `APP_INTERCEPTOR`
- [`server/src/common/interceptors/sentry.interceptor.ts`](../server/src/common/interceptors/sentry.interceptor.ts) — Logique de filtrage et d'enrichissement

### Référentiels et bonnes pratiques

- ITIL v4 — Incident Management
- ISO/IEC 20000 — Service management
- [Sentry Best Practices](https://docs.sentry.io/product/best-practices/)
- [12-Factor App — Logs](https://12factor.net/logs)
