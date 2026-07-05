# API Reference

Référence complète des endpoints REST exposés par le backend NestJS.

**Base URL** : `http://localhost:3002`

**Authentification** : tous les endpoints protégés attendent un header :

```
Authorization: Bearer <jwt-token>
```

Légende :
- 🔓 Public (aucun token requis)
- 🔐 Protégé (`JwtAuthGuard`, 401 sans token)
- 🔓+ Optionnel (`JwtAuthOptionalGuard`, fonctionne sans token mais enrichit la réponse si fourni)

---

## Sommaire

- [Auth](#auth)
- [Users](#users)
- [Photos](#photos)
- [Reviews](#reviews)
- [Annotations](#annotations)
- [Notifications](#notifications)

---

## Auth

### `POST /auth/login` 🔓

Authentifie un utilisateur et retourne un JWT.

**Body**
```json
{
  "email": "alice@example.com",
  "password": "secret"
}
```

**Response 200**
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "alice@example.com",
    "username": "alice",
    "avatarUrl": null
  }
}
```

**Errors**
- `401` Identifiants invalides

---

## Users

### `POST /users` 🔓

Crée un nouvel utilisateur (inscription).

**Body**
```json
{
  "email": "alice@example.com",
  "username": "alice",
  "password": "secret"
}
```

Le mot de passe est haché avec bcrypt (10 rounds) avant insertion.

**Response 201** : objet utilisateur (sans le password).

---

### `GET /users` 🔓

Liste tous les utilisateurs.

---

### `GET /users/search?q=<query>` 🔓

Recherche d'utilisateurs par username (insensible à la casse, `contains`, limité à 10 résultats).

**Response 200**
```json
[
  { "id": "uuid", "username": "alice", "avatarUrl": "..." }
]
```

---

### `PATCH /users/me` 🔐

Met à jour les paramètres du compte courant.

**Body** (tous les champs sont optionnels)
```json
{
  "avatarUrl": "https://...",
  "bio": "Photographe nature",
  "isPrivate": true
}
```

**Response 200** : utilisateur mis à jour.

---

### `GET /users/me/follow-requests` 🔐

Liste les demandes d'abonnement reçues par l'utilisateur courant (statut `PENDING`).

**Response 200**
```json
[
  {
    "id": "uuid",
    "follower": { "id": "uuid", "username": "alice", "avatarUrl": "..." },
    "createdAt": "2026-04-27T10:00:00.000Z"
  }
]
```

---

### `POST /users/follow-requests/:requestId/accept` 🔐

Accepte une demande d'abonnement. Connecte les deux utilisateurs, supprime la requête, et crée une notification `FOLLOW_ACCEPTED` pour le demandeur.

**Response 200** : `{ success: true }`

---

### `POST /users/follow-requests/:requestId/decline` 🔐

Refuse une demande d'abonnement. Supprime la requête (aucune notification au demandeur).

**Response 200** : `{ success: true }`

---

### `GET /users/:id/profile` 🔓+

Retourne le profil détaillé d'un utilisateur, incluant la relation avec l'utilisateur courant.

**Response 200**
```json
{
  "id": "uuid",
  "username": "alice",
  "avatarUrl": "...",
  "bio": "...",
  "isPrivate": true,
  "photosCount": 12,
  "followersCount": 34,
  "followingCount": 21,
  "isFollowing": false,
  "hasPendingRequest": true,
  "isOwnProfile": false,
  "photos": [ /* tableau de Photo, tronqué si privé et non-abonné */ ]
}
```

---

### `POST /users/:targetId/follow` 🔐

Toggle abonnement.
- Profil **public** : connecte/déconnecte directement.
- Profil **privé** : crée ou supprime une `FollowRequest` selon l'état.

**Response 200**
```json
{
  "status": "following" | "requested" | "unfollowed" | "request_cancelled"
}
```

---

### `GET /users/:id` 🔓

Récupère un utilisateur par id.

### `PATCH /users/:id` 🔓 _(legacy admin)_

Met à jour un utilisateur arbitraire.

### `DELETE /users/:id` 🔓 _(legacy admin)_

Supprime un utilisateur.

---

## Photos

### `POST /photos` 🔓

Upload une nouvelle photo (multipart/form-data).

**Form-data**
| Champ | Type | Requis |
|---|---|---|
| `file` | binaire (≤ 50 Mo) | Oui |
| `title` | string | Oui |
| `description` | string | Non |
| `cameraModel` | string | Non |
| `userId` | string (uuid) | Oui |

Les EXIF (aperture, shutterSpeed, iso, focalLength, lensModel) sont extraits automatiquement par `exifr`. Le `cameraModel` du form prime sur celui des EXIF.

**Response 201** : photo créée.

---

### `GET /photos` 🔓

Liste toutes les photos (sans filtre, sans pagination).

---

### `GET /photos/feed` 🔓+

Feed paginé/filtré pour la home page.

**Query params**
| Param | Type | Description |
|---|---|---|
| `cameraModel` | string | Filtre `contains` insensible à la casse |
| `lensModel` | string | Filtre `contains` insensible à la casse |
| `minIso` | number | Borne inférieure ISO |
| `maxIso` | number | Borne supérieure ISO |

**Response 200** : tableau de photos avec auteur, compteurs likes, et `liked: boolean` selon l'utilisateur courant.

---

### `GET /photos/explore` 🔓+

Tableau d'Honneur : top 20 photos des 7 derniers jours.

Tri :
1. `perfectCount DESC`
2. `likes._count DESC`
3. `createdAt DESC`

**Response 200** : même format que `/photos/feed`.

---

### `GET /photos/:id` 🔓+

Détail complet d'une photo : auteur, likes, reviews avec annotations imbriquées, `liked` selon l'utilisateur courant.

---

### `POST /photos/:id/like` 🔐

Toggle like sur une photo.

**Response 200**
```json
{
  "liked": true,
  "likesCount": 42
}
```

---

### `PATCH /photos/:id` 🔓

Met à jour une photo (titre, description, cameraModel, etc.).

---

### `PATCH /photos/:id/perfect` 🔓

Incrémente le compteur "Perfect" d'une photo (utilisé pour le tri Explore).

---

### `DELETE /photos/:id` 🔓

Supprime une photo et toutes ses dépendances (reviews, likes en cascade).

---

## Reviews

### `POST /reviews` 🔓

Crée une critique avec ses annotations en cascade (transaction).

**Body**
```json
{
  "content": "Super lumière, attention au cadrage en haut.",
  "photoId": "uuid",
  "userId": "uuid",
  "annotations": [
    {
      "type": "rect",
      "color": "#ef4444",
      "comment": null,
      "data": { "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4 }
    },
    {
      "type": "freehand",
      "color": "#22c55e",
      "comment": null,
      "data": { "points": [[0.1, 0.2], [0.15, 0.25], [0.2, 0.3]] }
    }
  ]
}
```

**Response 201** : review créée avec ses annotations.

---

### `GET /reviews` 🔓

Liste toutes les reviews.

### `GET /reviews/photo/:photoId` 🔓

Liste les reviews d'une photo précise.

### `GET /reviews/:id` 🔓

Détail d'une review.

### `PATCH /reviews/:id` 🔓

Met à jour le contenu d'une review.

### `DELETE /reviews/:id` 🔐

Supprime une review. Vérifie que l'utilisateur courant en est l'auteur (sinon `403`).

---

## Annotations

CRUD générique sur les annotations (utilisé surtout en interne).

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/annotations` | Crée une annotation |
| `GET` | `/annotations` | Liste toutes les annotations |
| `GET` | `/annotations/:id` | Détail |
| `PATCH` | `/annotations/:id` | Met à jour |
| `DELETE` | `/annotations/:id` | Supprime |

**Format de la donnée `data` (JSON)**

```json
// type = "rect"
{ "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4 }

// type = "freehand"
{ "points": [[x1, y1], [x2, y2], ...] }
```

Toutes les coordonnées sont **normalisées entre 0 et 1** par rapport aux dimensions de l'image, ce qui rend l'affichage indépendant de la résolution de rendu.

---

## Notifications

Tous les endpoints sont protégés (`@UseGuards(JwtAuthGuard)` au niveau du contrôleur).

### `GET /notifications` 🔐

Liste les 50 dernières notifications de l'utilisateur courant, triées par `createdAt DESC`.

**Response 200**
```json
[
  {
    "id": "uuid",
    "type": "FOLLOW_REQUEST",
    "message": "alice souhaite vous suivre.",
    "isRead": false,
    "relatedId": "uuid-of-related-user",
    "createdAt": "2026-04-27T10:00:00.000Z"
  }
]
```

---

### `GET /notifications/unread-count` 🔐

Compteur de notifications non lues. Utilisé pour le badge de la cloche.

**Response 200**
```json
{ "count": 3 }
```

---

### `POST /notifications/read-all` 🔐

Marque toutes les notifications de l'utilisateur courant comme lues.

**Response 200**
```json
{ "count": 3 }
```

---

### `POST /notifications/:id/read` 🔐

Marque une notification précise comme lue.

**Response 200** : notification mise à jour.

---

## Codes d'erreur communs

| Code | Signification |
|---|---|
| `400` | Bad Request — body ou paramètres invalides |
| `401` | Unauthorized — JWT manquant ou invalide |
| `403` | Forbidden — pas autorisé sur cette ressource |
| `404` | Not Found — ressource inexistante |
| `500` | Internal Server Error |
