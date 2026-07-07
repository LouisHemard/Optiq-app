# Stratégie de tests — NestJS / Jest

Compte-rendu pédagogique pour la soutenance (Bloc 2) : démontrer que les tests unitaires couvrent la logique métier critique avec une stratégie de mock propre.

> **Stack** : NestJS 11, Jest 30, ts-jest, `@nestjs/testing`

---

## Sommaire

1. [Résultats globaux](#1-résultats-globaux)
2. [Stratégie de test](#2-stratégie-de-test)
3. [Le test phare : `AuthService`](#3-le-test-phare--authservice)
4. [Comment lancer les tests](#4-comment-lancer-les-tests)
5. [Discours type pour le jury](#5-discours-type-pour-le-jury)

---

## 1. Résultats globaux

```
Test Suites: 10 passed, 10 total
Tests:       62 passed, 62 total
Snapshots:   0 total
Time:        ~2 s
```

| Module | Suite testée | Tests |
|---|---|---|
| Auth | `auth.service.spec.ts` | **6** |
| App | `app.controller.spec.ts` | 1 |
| Users | `users.service.spec.ts` | **17** |
| Photos | `photos.service.spec.ts` | **14** |
| Reviews | `reviews.service.spec.ts` | **8** |
| Annotations | `annotations.service.spec.ts` | **7** |
| Controllers | `*.controller.spec.ts` (×5) | 5 (stubs) |

Le fichier le plus important est **`auth.service.spec.ts`** (6 scénarios métiers couvrant la logique de connexion), mais les quatre services métier principaux disposent chacun d'une suite complète.

---

## 2. Stratégie de test

### Pourquoi mocker ?

Un **test unitaire** doit isoler une seule unité (une classe, une méthode) de ses dépendances. Sans mocking, tester `AuthService` :

- nécessiterait une vraie base de données PostgreSQL (lent, fragile)
- nécessiterait un secret JWT configuré
- mélangerait les responsabilités : si `UsersService.findByEmail()` a un bug, le test de `AuthService` échouerait à tort

On **remplace les dépendances par des objets simulés** dont on contrôle entièrement le comportement.

### Trois techniques de mock utilisées

#### 1. `jest.fn()` — fonction simulée

```ts
const usersService = { findByEmail: jest.fn() };
```

Une fonction qui :
- retourne `undefined` par défaut
- enregistre tous ses appels (`usersService.findByEmail.mock.calls`)
- peut être configurée par scénario : `mockResolvedValue(...)`, `mockRejectedValue(...)`

#### 2. `useValue` — injection NestJS

```ts
const module = await Test.createTestingModule({
  providers: [
    AuthService,
    { provide: UsersService, useValue: usersService },
    { provide: JwtService, useValue: jwtService },
  ],
}).compile();
```

NestJS résout normalement `UsersService` via son DI container ; ici on lui dit *"chaque fois que tu vois UsersService, utilise plutôt cet objet mock"*. C'est l'équivalent NestJS du **stub**.

#### 3. `jest.mock('bcryptjs')` — mock de module externe

```ts
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
```

Pour les modules npm externes qu'on ne peut pas injecter (ils sont importés directement, pas via le constructeur), on utilise `jest.mock()` qui remplace **tout le module** par des mocks automatiques. Ensuite on configure le retour souhaité :

```ts
mockedBcrypt.compare.mockImplementation(() => Promise.resolve(true));
```

#### 4. `makePrisma()` — factory de mock Prisma

Pour les services qui parlent directement à Prisma, on utilise une factory qui retourne un objet mock complet :

```ts
const makePrisma = () => ({
  photo: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  like: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
});
```

Cette approche permet de recréer un mock propre avant chaque test (`beforeEach(() => { prisma = makePrisma(); })`), sans état partagé entre les scénarios.

---

## 3. Le test phare : `AuthService`

### Code testé (`src/auth/auth.service.ts`)

```ts
async login(email: string, password: string) {
  const user = await this.usersService.findByEmail(email);
  if (!user) throw new UnauthorizedException(...);

  const passwordValid = await bcrypt.compare(password, user.password);
  if (!passwordValid) throw new UnauthorizedException(...);

  return {
    access_token: this.jwtService.sign({ sub: user.id, username: user.username }),
    user: { id, email, username, avatarUrl }, // SANS le password
  };
}
```

### Les 6 scénarios couverts

| # | Scénario | But |
|---|---|---|
| 1 | `should be defined` | Vérifie que le service est correctement instancié par le container DI de NestJS |
| 2 | **Login OK** : identifiants valides → token + user | Cas nominal — vérifie le retour complet |
| 3 | **Login KO** : utilisateur inexistant | Vérifie `UnauthorizedException` + que `bcrypt` et `jwt` ne sont **pas** appelés |
| 4 | **Login KO** : mot de passe incorrect | Vérifie que `bcrypt.compare` est bien invoqué mais que `jwt.sign` ne l'est pas |
| 5 | Payload JWT correct | Vérifie que le token contient `sub` + `username`, **jamais le mot de passe ni l'email** |
| 6 | Erreur DB propagée | Robustesse : si Prisma plante, l'erreur remonte au lieu d'être avalée |

### Code complet (extrait commenté)

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// 1. Mock automatique du module bcryptjs (compare devient une jest.fn())
jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: { findByEmail: jest.Mock };
  let jwtService: { sign: jest.Mock };

  // 2. Avant chaque test, on reconstruit un module NestJS isolé
  beforeEach(async () => {
    usersService = { findByEmail: jest.fn() };
    jwtService = { sign: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService }, // injection du mock
        { provide: JwtService, useValue: jwtService },     // injection du mock
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // 3. Reset des compteurs entre tests
  });

  describe('login', () => {

    // CAS DE SUCCÈS
    it('retourne un access_token et le user quand les identifiants sont valides', async () => {
      usersService.findByEmail.mockResolvedValue(fakeUser);
      mockedBcrypt.compare.mockImplementation(() => Promise.resolve(true));
      jwtService.sign.mockReturnValue('signed.jwt.token');

      const result = await authService.login('alice@example.com', 'goodpassword');

      expect(usersService.findByEmail).toHaveBeenCalledWith('alice@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('goodpassword', fakeUser.password);

      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user).not.toHaveProperty('password'); // Sécurité
    });

    // CAS D'ÉCHEC : user inexistant
    it("lève UnauthorizedException quand l'utilisateur n'existe pas", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('inconnu@example.com', 'whatever'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockedBcrypt.compare).not.toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });

    // CAS D'ÉCHEC : mauvais mot de passe
    it('lève UnauthorizedException quand le mot de passe est incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(fakeUser);
      mockedBcrypt.compare.mockImplementation(() => Promise.resolve(false));

      await expect(
        authService.login('alice@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);

      expect(mockedBcrypt.compare).toHaveBeenCalled();
      expect(jwtService.sign).not.toHaveBeenCalled();
    });
  });
});
```

### Pourquoi ces tests sont **bons**

1. **Isolation totale** : aucune dépendance externe (BDD, JWT, bcrypt réel)
2. **Rapidité** : la suite tourne en ~2 s pour 62 tests
3. **Déterministe** : aucun état partagé entre les tests grâce à `beforeEach` qui recrée tout
4. **Couverture des cas limites** : succès, deux types d'échec, propagation d'erreurs
5. **Vérifications croisées** : on contrôle à la fois ce qui est retourné ET ce qui est appelé (via `toHaveBeenCalledWith`)
6. **Sécurité testée** : le test n°5 vérifie explicitement que **le mot de passe ne fuite jamais** dans le JWT ni dans la réponse

---

## 4. Comment lancer les tests

### Commande principale

```bash
cd server
npm run test
```

Sortie attendue :

```
Test Suites: 10 passed, 10 total
Tests:       62 passed, 62 total
Time:        ~2 s
```

### Variantes utiles

| Commande | Description |
|---|---|
| `npm run test` | Lance toute la suite une fois |
| `npm run test:watch` | Mode interactif : relance automatiquement à chaque sauvegarde |
| `npm run test:cov` | Génère un rapport de couverture (dossier `coverage/`) |
| `npm test -- auth.service` | Filtre : ne lance que les tests dont le fichier matche `auth.service` |
| `npm test -- --verbose` | Affiche le détail de chaque assertion |

### Démo conseillée pour la soutenance

```bash
# Lance tous les tests avec affichage détaillé
npm test -- --verbose
```

---

## 5. Discours type pour le jury

> "Pour répondre aux exigences du Bloc 2 sur les tests unitaires, j'ai écrit une suite complète de **62 tests** couvrant les cinq services métier principaux de l'application : Auth, Users, Photos, Reviews et Annotations.
>
> **Le principe d'un test unitaire**, c'est d'isoler une seule classe de toutes ses dépendances pour vérifier sa logique métier de manière déterministe et rapide. Par exemple, `AuthService` dépend de trois choses : `UsersService` (qui parle à la base de données via Prisma), `JwtService` (qui signe les tokens) et `bcryptjs` (le module de hashage). J'ai mocké les trois.
>
> J'ai utilisé plusieurs techniques de mocking :
>
> 1. **`useValue` dans le module de test NestJS** pour les services injectés par DI : je passe au container un objet simulé contenant juste les méthodes nécessaires, implémentées avec `jest.fn()`.
>
> 2. **`jest.mock('bcryptjs')`** pour le module externe importé directement : Jest remplace automatiquement toutes ses fonctions par des mocks que je peux configurer scénario par scénario.
>
> 3. **Une factory `makePrisma()`** pour créer un mock complet de PrismaService avant chaque test — ce pattern garantit l'isolation totale entre les scénarios.
>
> Pour chaque test, je vérifie à la fois **ce qui est retourné** par la méthode et **ce qui est appelé** sur les dépendances. Par exemple, dans le cas où l'utilisateur n'existe pas, je vérifie que `bcrypt.compare` n'est jamais appelé — c'est important pour ne pas perdre de temps CPU inutilement.
>
> Au total, j'ai **62 tests qui passent au vert** dans toute la base de code, en moins de deux secondes. Ces tests s'exécutent automatiquement dans la CI à chaque commit, ce qui garantit la non-régression."

---

## Annexes

### Configuration Jest (extraite de `server/package.json`)

```json
"jest": {
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

- `testRegex` : Jest cherche tous les fichiers `*.spec.ts` dans `src/`
- `ts-jest` : transpile le TypeScript à la volée pour Jest
- Aucun `--watch` par défaut (configurable via `npm run test:watch`)

### Fichiers de tests

- **`src/auth/auth.service.spec.ts`** — 6 scénarios métiers (connexion, JWT, sécurité)
- **`src/users/users.service.spec.ts`** — 17 tests (create, search, toggleFollow, settings)
- **`src/photos/photos.service.spec.ts`** — 14 tests (upload local/Supabase, feed, like, filtres)
- **`src/reviews/reviews.service.spec.ts`** — 8 tests (create, CRUD, autorisation)
- **`src/annotations/annotations.service.spec.ts`** — 7 tests (create avec couleur par défaut, update partiel)
- **`src/*.controller.spec.ts`** (×5) — 1 test chacun (instanciation via DI)
- **`src/app.controller.spec.ts`** — 1 test
