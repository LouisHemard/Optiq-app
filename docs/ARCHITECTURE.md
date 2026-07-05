# Architecture technique

Vue d'ensemble de la structure du code, des modules backend et frontend, et des flux principaux.

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Structure du repo (monorepo)](#2-structure-du-repo-monorepo)
3. [Backend (NestJS)](#3-backend-nestjs)
4. [Frontend (React)](#4-frontend-react)
5. [Flux d'authentification](#5-flux-dauthentification)
6. [Flux d'upload de photo](#6-flux-dupload-de-photo)
7. [Flux d'annotation](#7-flux-dannotation)
8. [Stockage des images](#8-stockage-des-images)

---

## 1. Vue d'ensemble

```
┌─────────────────┐  HTTP/JSON  ┌──────────────────┐  Prisma  ┌──────────────┐
│  Client React   │ ←─────────→ │  Server NestJS   │ ←──────→ │  PostgreSQL  │
│  (Vite + TS)    │  + JWT      │  (Multer/exifr)  │   ORM    │  (Docker)    │
│  Port 5173      │             │  Port 3002       │          │  Port 5434   │
└─────────────────┘             └──────────────────┘          └──────────────┘
                                          │
                                          ↓
                                  ┌─────────────────┐
                                  │  Storage local  │
                                  │  /uploads/...   │
                                  └─────────────────┘
```

---

## 2. Structure du repo (monorepo)

```
optiq-app/
├── README.md
├── docs/
│   ├── FEATURES.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DATABASE.md
├── client/          # Frontend React/Vite
└── server/          # Backend NestJS
```

---

## 3. Backend (NestJS)

### Arborescence

```
server/src/
├── main.ts                  # Point d'entrée (CORS, port, static)
├── app.module.ts            # Module racine
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts    # Wrapper PrismaClient avec onModuleInit
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts   # POST /auth/login
│   ├── auth.service.ts      # validateUser, login (JWT)
│   ├── jwt.strategy.ts      # Passport strategy
│   ├── jwt-auth.guard.ts    # Guard obligatoire
│   ├── jwt-auth-optional.guard.ts  # Guard optionnel
│   └── current-user.decorator.ts   # @CurrentUser()
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts  # CRUD + profile + follow + search
│   ├── users.service.ts
│   └── dto/
│       ├── create-user.dto.ts
│       ├── update-user.dto.ts
│       └── update-settings.dto.ts
├── photos/
│   ├── photos.module.ts
│   ├── photos.controller.ts # CRUD + feed + explore + like
│   ├── photos.service.ts    # Multer + exifr + Prisma + likes
│   └── dto/
│       ├── create-photo.dto.ts
│       ├── update-photo.dto.ts
│       └── feed-query.dto.ts
├── reviews/
│   ├── reviews.module.ts
│   ├── reviews.controller.ts
│   └── reviews.service.ts   # Crée annotations en cascade
├── annotations/
│   └── ...                  # CRUD annotations
├── notifications/
│   ├── notifications.module.ts
│   ├── notifications.controller.ts # GET + read
│   └── notifications.service.ts
├── storage/                 # Service de stockage abstrait
└── cloudinary/              # Adaptateur optionnel
```

### Modules NestJS enregistrés

```ts
// app.module.ts
imports: [
  PrismaModule,
  UsersModule,
  PhotosModule,
  ReviewsModule,
  AnnotationsModule,
  AuthModule,
  NotificationsModule,
]
```

### Stratégie JWT

`JwtStrategy` (Passport) extrait le token du header `Authorization: Bearer <token>` et décode le payload `{ sub: userId, username }`. Le payload est exposé sur `req.user`.

Deux guards :
- **`JwtAuthGuard`** : route protégée, 401 si pas de token
- **`JwtAuthOptionalGuard`** : enrichit `req.user` si token présent, mais ne bloque pas la requête

Décorateur custom **`@CurrentUser()`** : récupère `req.user` typé.

### DTOs et validation

NestJS utilise des classes DTO (`CreatePhotoDto`, `UpdateSettingsDto`...) qui servent à typer les bodies. Aucune validation runtime stricte (`class-validator`) n'est en place — la validation se fait dans les services.

---

## 4. Frontend (React)

### Arborescence

```
client/src/
├── main.tsx                 # Mount React + StrictMode
├── App.tsx                  # Router + Navbar + AuthProvider
├── index.css                # Tailwind
├── context/
│   └── AuthContext.tsx      # user, token, loginUser, logoutUser, updateUser
├── services/
│   └── api.ts               # Axios + interceptor + toutes les fonctions API
├── types/
│   └── index.ts             # User, Photo, Review, Annotation
├── constants/
│   └── cameras.ts           # POPULAR_CAMERAS
├── utils/
│   └── exif.ts              # formatShutterSpeed + EXIF_TOOLTIPS
├── components/
│   ├── PhotoCard.tsx
│   ├── ReviewCanvas.tsx           # Konva + RDP simplification
│   ├── AnnotatedThumbnail.tsx
│   ├── ExifBadge.tsx              # Badge avec tooltip
│   └── NotificationDropdown.tsx
└── pages/
    ├── Home.tsx                   # Feed + filtres
    ├── ExplorePage.tsx            # Top 7j + recherche
    ├── PhotoPage.tsx              # Détail photo + critiques
    ├── UploadPage.tsx
    ├── ProfilePage.tsx            # Public/Privé + 3 états follow
    ├── SettingsPage.tsx
    ├── LoginPage.tsx
    └── RegisterPage.tsx
```

### State management

**`AuthContext`** est le seul contexte global. Il expose :
- `user: AuthUser | null`
- `token: string | null`
- `loginUser(email, password)`
- `logoutUser()`
- `updateUser(patch)` — pour rafraîchir l'avatar/username localement après modification des paramètres

Persistance via `localStorage` :
- `optiq_token` : JWT
- `optiq_user` : objet utilisateur sérialisé

Pour le reste, React state local (`useState`) + appels API directs depuis chaque page.

### Routing

```tsx
<BrowserRouter>
  <AuthProvider>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/explore" element={<ExplorePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/profile/:id" element={<ProfilePage />} />
      <Route path="/photo/:id" element={<PhotoPage />} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```

### Couche API

`client/src/services/api.ts` centralise **toutes** les requêtes HTTP via une instance Axios :

```ts
export const api = axios.create({ baseURL: 'http://localhost:3002' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('optiq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

Liste exhaustive des fonctions exportées :
- **Auth** : `login`
- **Users** : `getUsers`, `createUser`, `updateMe`, `getProfile`, `searchUsers`
- **Follow** : `toggleFollow`, `getFollowRequests`, `acceptFollowRequest`, `declineFollowRequest`
- **Photos** : `uploadPhoto`, `getFeed`, `getPhotoById`, `getExplorePhotos`, `deletePhoto`, `toggleLike`
- **Reviews** : `getPhotoReviews`, `createReview`, `deleteReview`
- **Notifications** : `getNotifications`, `getUnreadCount`, `markAllNotificationsRead`, `markNotificationRead`

---

## 5. Flux d'authentification

```
1. User remplit /login (email + password)
   ↓
2. POST /auth/login { email, password }
   ↓
3. AuthService.login()
   - findByEmail() via PrismaService
   - bcrypt.compare(password, user.password)
   - Si OK : jwtService.sign({ sub: id, username })
   ↓
4. Response: { access_token, user }
   ↓
5. Frontend (AuthContext.loginUser):
   - localStorage.setItem('optiq_token', access_token)
   - localStorage.setItem('optiq_user', JSON.stringify(user))
   - setUser(user) + setToken(access_token)
   ↓
6. Redirection vers /
   ↓
7. Toutes les requêtes Axios injectent désormais Authorization: Bearer <token>
```

Au refresh de la page, `AuthContext` lit le localStorage dans un `useEffect` et restaure user + token.

---

## 6. Flux d'upload de photo

```
1. User remplit /upload (file + title + cameraModel)
   ↓
2. FormData + POST /photos
   - Header: Authorization: Bearer <token>
   - Body: file (binary) + title + cameraModel
   ↓
3. PhotosController.create()
   - Multer en mémoire (memoryStorage())
   - Validation: file.buffer présent
   ↓
4. PhotosService.create():
   - extractExif(file.buffer) via exifr.parse()
   - resolveImageUrl(file) → upload local/Supabase/Cloudinary
   - createPhotoDto.cameraModel prime sur exif.cameraModel
   - prisma.photo.create({ ... })
   ↓
5. Response: photo créée avec id
   ↓
6. Frontend redirige vers /photo/${photo.id}
```

---

## 7. Flux d'annotation

### Côté frontend (PhotoPage + ReviewCanvas)

```
1. User active "Mode dessin" + sélectionne outil (rectangle/freehand)
   ↓
2. Mouse events sur Stage Konva
   - rectangle: mousedown → mousemove (preview) → mouseup
   - freehand: mousedown → mousemove (push points) → mouseup
   ↓
3. Sur mouseup:
   - Si freehand: simplify(points, RDP_EPSILON=4) supprime les points superflus
   - Normalisation: points / stageW, points / stageH (ratio 0-1)
   - onDrawEnd({ type, data, color })
   ↓
4. PhotoPage.handleDrawEnd:
   - setPendingAnnotations([...prev, newAnnotation])
   - Si limite de 6 atteinte: setDrawMode(false)
   ↓
5. User clique "Publier la Review"
   ↓
6. POST /reviews { photoId, userId, content, annotations: [...] }
   ↓
7. ReviewsService.create():
   - prisma.review.create({ data: { ..., annotations: { create: [...] } } })
   ↓
8. La nouvelle review est ajoutée en tête de la liste
```

### Algorithme RDP

Implémenté dans `ReviewCanvas.tsx`. Réduit drastiquement le nombre de points (300+ → ~10-30) tout en préservant la forme générale.

```ts
function rdp(pts, start, end, epsilon, out) {
  // Trouve le point le plus éloigné de la corde [start, end]
  // Si distance > epsilon, garde ce point et récurse sur les deux moitiés
  // Sinon, élimine tous les points intermédiaires
}
```

---

## 8. Stockage des images

Le service `StorageService` (`server/src/storage/`) abstrait trois backends possibles :

| Backend | Configuration | Usage |
|---|---|---|
| **Local** (défaut) | Aucune | Sauvegarde dans `server/uploads/`, exposé via `app.useStaticAssets()` dans `main.ts` |
| **Supabase Storage** | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` | Upload via `@supabase/supabase-js` |
| **Cloudinary** | `CLOUDINARY_*` env vars | Upload via SDK Cloudinary |

Le service essaie d'abord Supabase/Cloudinary si configuré, et tombe sur le stockage local en fallback.

### CORS et static files

`main.ts` configure :
```ts
app.enableCors({ origin: '*' });
app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });
```

Les images sont accessibles via `http://localhost:3002/uploads/<filename>`.
