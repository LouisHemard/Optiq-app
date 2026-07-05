# Tests unitaires — NestJS / Jest

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
Tests:       15 passed, 15 total
Snapshots:   0 total
Time:        1.333 s
```

| Module | Suite testée | Tests |
|---|---|---|
| Auth | `auth.service.spec.ts` | **6** ✅ |
| App | `app.controller.spec.ts` | 1 ✅ |
| Users | `users.service.spec.ts` + `users.controller.spec.ts` | 2 ✅ |
| Photos | `photos.service.spec.ts` + `photos.controller.spec.ts` | 2 ✅ |
| Reviews | `reviews.service.spec.ts` + `reviews.controller.spec.ts` | 2 ✅ |
| Annotations | `annotations.service.spec.ts` + `annotations.controller.spec.ts` | 2 ✅ |

Le fichier le plus important est **`auth.service.spec.ts`** (6 scénarios métiers couvrant la logique de connexion).

---

## 2. Stratégie de test

### Pourquoi mocker ?

Un **test unitaire** doit isoler une seule unité (une classe, une méthode) de ses dépendances. Sans mocking, tester `AuthService` :

- nécessiterait une vraie base de données PostgreSQL (lent, fragile)
- nécessiterait un secret JWT configuré
- mélangerait les responsabilités : si `UsersService.findByEmail()` a un bug, le test de `AuthService` échouerait à tort

→ On **remplace les dépendances par des objets simulés** dont on contrôle entièrement le comportement.

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

#### 3. `jest.mock('bcrypt')` — mock de module externe

```ts
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
```

Pour les modules npm externes qu'on ne peut pas injecter (ils sont importés directement, pas via le constructeur), on utilise `jest.mock()` qui remplace **tout le module** par des mocks automatiques. Ensuite on configure le retour souhaité :

```ts
mockedBcrypt.compare.mockImplementation(() => Promise.resolve(true));
```

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
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

// 1. Mock automatique du module bcrypt (compare devient une jest.fn())
jest.mock('bcrypt');
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
        { provide: UsersService, useValue: usersService }, // ← injection du mock
        { provide: JwtService, useValue: jwtService },     // ← injection du mock
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

      // On vérifie les APPELS aux dépendances
      expect(usersService.findByEmail).toHaveBeenCalledWith('alice@example.com');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('goodpassword', fakeUser.password);

      // On vérifie le RETOUR
      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.user).not.toHaveProperty('password'); // Sécurité
    });

    // CAS D'ÉCHEC : user inexistant
    it("lève UnauthorizedException quand l'utilisateur n'existe pas", async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('inconnu@example.com', 'whatever'),
      ).rejects.toThrow(UnauthorizedException);

      // Garde-fou : on vérifie que les fonctions coûteuses N'ONT PAS été appelées
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
2. **Rapidité** : la suite tourne en ~600 ms (vs plusieurs secondes pour un test d'intégration)
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
Tests:       15 passed, 15 total
Time:        ~1.3 s
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
# Lance uniquement le test d'AuthService avec verbose
npm test -- auth.service --verbose
```

Sortie :
```
PASS src/auth/auth.service.spec.ts
  AuthService
    ✓ should be defined (6 ms)
    login
      ✓ retourne un access_token et le user quand les identifiants sont valides (3 ms)
      ✓ lève UnauthorizedException quand l'utilisateur n'existe pas (6 ms)
      ✓ lève UnauthorizedException quand le mot de passe est incorrect (1 ms)
      ✓ utilise le bon payload JWT (sub + username) sans inclure le mot de passe (1 ms)
      ✓ propage l'erreur si UsersService échoue (ex: base de données indisponible) (2 ms)

Tests: 6 passed, 6 total
```

---

## 5. Discours type pour le jury

> "Pour répondre aux exigences du Bloc 2 sur les tests unitaires, j'ai écrit un fichier de spécifications complet pour le service le plus critique de l'application : **`AuthService`**, qui gère la connexion des utilisateurs.
>
> **Le principe d'un test unitaire**, c'est d'isoler une seule classe de toutes ses dépendances pour vérifier sa logique métier de manière déterministe et rapide. `AuthService` dépend de trois choses : `UsersService` (qui parle à la base de données via Prisma), `JwtService` (qui signe les tokens) et `bcrypt` (le module de hashage). J'ai mocké les trois.
>
> J'ai utilisé deux techniques de mocking :
>
> 1. **`useValue` dans le module de test NestJS** pour les services injectés par DI : je passe au container un objet simulé contenant juste les méthodes nécessaires (`findByEmail` et `sign`), implémentées avec `jest.fn()`.
>
> 2. **`jest.mock('bcrypt')`** pour le module externe importé directement : Jest remplace automatiquement toutes ses fonctions par des mocks que je peux configurer scénario par scénario.
>
> Ensuite, j'ai écrit **6 scénarios** couvrant les cas nominaux et les cas d'erreur :
> - Succès avec un retour de token et de user (sans le password)
> - Échec si l'utilisateur n'existe pas → `UnauthorizedException`
> - Échec si le mot de passe est incorrect → `UnauthorizedException`
> - Validation du payload JWT (sub + username, sans données sensibles)
> - Propagation des erreurs de base de données
>
> Pour chaque test, je vérifie à la fois **ce qui est retourné** par la méthode et **ce qui est appelé** sur les dépendances. Par exemple, dans le cas où l'utilisateur n'existe pas, je vérifie que `bcrypt.compare` n'est jamais appelé — c'est important pour ne pas perdre de temps CPU.
>
> Au total, j'ai **15 tests qui passent au vert** dans toute la base de code, et le test d'`AuthService` à lui seul couvre tous les chemins d'exécution de la méthode `login`. Le tout tourne en moins d'une seconde et demie, ce qui me permet d'intégrer facilement les tests dans une CI."

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

### Fichiers de tests créés/modifiés

- ✅ **`src/auth/auth.service.spec.ts`** — créé (6 scénarios métiers complets)
- ✅ `src/users/users.service.spec.ts` — corrigé (mock de `PrismaService`)
- ✅ `src/users/users.controller.spec.ts` — corrigé (mock de `UsersService`)
- ✅ `src/photos/photos.service.spec.ts` — corrigé (mock de `Prisma` + `LocalStorage` + `SupabaseStorage`)
- ✅ `src/photos/photos.controller.spec.ts` — corrigé
- ✅ `src/reviews/*.spec.ts` — corrigés
- ✅ `src/annotations/*.spec.ts` — corrigés

> Les fichiers autres que `auth.service.spec.ts` étaient des **stubs générés par le CLI NestJS** (juste un test "should be defined") et ils plantaient parce qu'ils n'injectaient pas les dépendances mockées. Je les ai corrigés pour que `npm run test` retourne 100% vert sur l'ensemble du projet.
>
> Le fichier réellement représentatif du travail de test métier est **`auth.service.spec.ts`** : c'est lui qu'il faut mettre en avant pour la soutenance.
