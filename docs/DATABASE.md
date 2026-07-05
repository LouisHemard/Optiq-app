# Base de données

Documentation du schéma Prisma utilisé par OPTIQ.

- **SGBD** : PostgreSQL 16
- **ORM** : Prisma 7
- **Localisation** : Docker (`postgres:16`) sur le port `5434`
- **Connexion locale** : `postgresql://myuser:mypassword@localhost:5434/optiq`

---

## Sommaire

- [Diagramme des relations](#diagramme-des-relations)
- [Modèle User](#modèle-user)
- [Modèle Photo](#modèle-photo)
- [Modèle Review](#modèle-review)
- [Modèle Annotation](#modèle-annotation)
- [Modèle Like](#modèle-like)
- [Modèle FollowRequest](#modèle-followrequest)
- [Modèle Notification](#modèle-notification)
- [Migrations & commandes utiles](#migrations--commandes-utiles)

---

## Diagramme des relations

```
                       ┌──────────────┐
                       │     User     │
                       └──────┬───────┘
                              │
       ┌──────────────────────┼─────────────────┬─────────────────┬─────────────────┐
       │                      │                 │                 │                 │
       ▼                      ▼                 ▼                 ▼                 ▼
┌─────────────┐       ┌─────────────┐    ┌─────────────┐  ┌────────────────┐ ┌────────────────┐
│    Photo    │ 1─N   │   Review    │    │    Like     │  │ FollowRequest  │ │  Notification  │
└─────┬───────┘       └─────┬───────┘    └─────────────┘  └────────────────┘ └────────────────┘
      │ 1                   │ 1                                          
      │                     │                                            
      │ N                   │ N                                          
      ▼                     ▼                                            
┌─────────────┐       ┌─────────────┐
│   Review    │       │ Annotation  │
└─────────────┘       └─────────────┘
                                                                         
                       ┌──────────────┐
                       │ User self-rel│ → "UserFollows" (M-N)
                       │  followers/  │
                       │  following   │
                       └──────────────┘
```

---

## Modèle User

| Champ | Type | Notes |
|---|---|---|
| `id` | `String` (uuid) | Clé primaire |
| `email` | `String` | **Unique** |
| `username` | `String` | **Unique** |
| `password` | `String` | Hashé via bcrypt (10 rounds) |
| `avatarUrl` | `String?` | URL externe ou null |
| `bio` | `String?` | Max 300 caractères côté frontend |
| `isPrivate` | `Boolean` | Défaut `false` |
| `createdAt` | `DateTime` | `@default(now())` |

**Relations** :
- `photos` : `Photo[]` (1-N)
- `reviews` : `Review[]` (1-N)
- `likes` : `Like[]` (1-N)
- `followers` / `following` : self-relation M-N nommée `"UserFollows"`
- `sentFollowRequests` / `receivedFollowRequests` : `FollowRequest[]`
- `notifications` : `Notification[]`

---

## Modèle Photo

| Champ | Type | Notes |
|---|---|---|
| `id` | `String` (uuid) | PK |
| `title` | `String` | |
| `description` | `String?` | |
| `imageUrl` | `String` | URL absolue (local `/uploads/...` ou externe) |
| `cameraModel` | `String?` | Saisi manuellement, prime sur EXIF |
| `lensModel` | `String?` | Extrait par exifr |
| `aperture` | `Float?` | Ex: `1.8` → "f/1.8" |
| `shutterSpeed` | `String?` | Stocké comme décimal (ex: `"0.001"`), formaté côté client |
| `iso` | `Int?` | |
| `focalLength` | `Int?` | en mm |
| `userId` | `String` | FK → User |
| `perfectCount` | `Int` | Défaut `0`, utilisé pour le tri Explore |
| `createdAt` | `DateTime` | |

**Relations** :
- `user` : `User`
- `reviews` : `Review[]`
- `likes` : `Like[]`

---

## Modèle Review

| Champ | Type | Notes |
|---|---|---|
| `id` | `String` (uuid) | PK |
| `content` | `String` | Texte de la critique |
| `photoId` | `String` | FK → Photo |
| `userId` | `String` | FK → User |
| `createdAt` | `DateTime` | |

**Relations** :
- `photo` : `Photo`
- `author` : `User`
- `annotations` : `Annotation[]` (1-N)

---

## Modèle Annotation

| Champ | Type | Notes |
|---|---|---|
| `id` | `String` (uuid) | PK |
| `type` | `String` | `"rect"` ou `"freehand"` |
| `data` | `Json` | Voir formats ci-dessous |
| `color` | `String` | Hex, défaut `"#ff0000"` |
| `comment` | `String?` | Optionnel |
| `reviewId` | `String` | FK → Review (`onDelete: Cascade`) |

**Format `data`** :

```jsonc
// type = "rect" — coordonnées normalisées 0-1
{
  "x": 0.1,
  "y": 0.2,
  "width": 0.3,
  "height": 0.4
}

// type = "freehand" — points normalisés 0-1, simplifiés via RDP côté client
{
  "points": [[0.1, 0.2], [0.15, 0.22], [0.18, 0.30]]
}
```

---

## Modèle Like

Table de jonction many-to-many entre `User` et `Photo`.

| Champ | Type | Notes |
|---|---|---|
| `userId` | `String` | FK → User, **partie de la clé composite** |
| `photoId` | `String` | FK → Photo, **partie de la clé composite** |

**Clé primaire** : `@@id([userId, photoId])` — garantit qu'un utilisateur ne peut liker une photo qu'une fois.

---

## Modèle FollowRequest

Représente une demande d'abonnement vers un profil privé.

| Champ | Type | Notes |
|---|---|---|
| `id` | `String` (uuid) | PK |
| `followerId` | `String` | FK → User (demandeur) |
| `followingId` | `String` | FK → User (cible) |
| `status` | `FollowRequestStatus` | `PENDING` / `ACCEPTED` / `REJECTED`, défaut `PENDING` |
| `createdAt` | `DateTime` | |

**Contrainte** : `@@unique([followerId, followingId])` — un seul follow request actif entre deux users.

**Cycle de vie** :
1. `PENDING` à la création
2. À l'acceptation : la requête est **supprimée** (et non passée à `ACCEPTED`) après que les deux users sont connectés
3. Au refus : la requête est **supprimée**
4. À l'annulation : la requête est **supprimée**

L'enum `ACCEPTED`/`REJECTED` est conservé pour usage futur (audit log éventuel).

---

## Modèle Notification

| Champ | Type | Notes |
|---|---|---|
| `id` | `String` (uuid) | PK |
| `userId` | `String` | FK → User (destinataire) |
| `type` | `NotificationType` | Voir enum ci-dessous |
| `message` | `String` | Texte affiché |
| `isRead` | `Boolean` | Défaut `false` |
| `relatedId` | `String?` | Id de l'entité liée (souvent un userId) — utilisé pour le lien click |
| `createdAt` | `DateTime` | |

**Enum `NotificationType`** :
- `FOLLOW_REQUEST` — quelqu'un veut vous suivre (cible : profil privé)
- `FOLLOW_ACCEPTED` — votre demande a été acceptée
- `NEW_REVIEW` — réservé pour usage futur (notif lors d'une nouvelle critique)

---

## Migrations & commandes utiles

### Initialisation

```bash
cd server
docker compose up -d            # PostgreSQL en arrière-plan
npx prisma generate             # génère le client TypeScript
npx prisma db push              # applique le schéma sans migration formelle
```

### Outils de développement

```bash
# Ouvrir Prisma Studio (UI web pour explorer la base)
npx prisma studio
# → http://localhost:5555

# Reset complet (⚠ perte de données)
npx prisma db push --force-reset

# Inspecter via psql directement
docker exec -it server-db-1 psql -U myuser -d optiq
```

### Variables d'environnement

```env
# server/.env
DATABASE_URL="postgresql://myuser:mypassword@localhost:5434/optiq"
JWT_SECRET="..."
PORT=3002
```

---

## Cascades & intégrité référentielle

| Relation | Comportement |
|---|---|
| `Annotation.review` | `onDelete: Cascade` — supprimer une review supprime ses annotations |
| `Like.user` / `Like.photo` | Pas de cascade explicite — utiliser `prisma.like.deleteMany()` avant suppression |
| `Review.photo` | Pas de cascade — utiliser `prisma.review.deleteMany()` avant suppression d'une photo |
| `Photo.user` | Pas de cascade — supprimer un user nécessite de purger ses photos d'abord |

⚠ Lors de la suppression d'une photo, le service `PhotosService.remove()` doit nettoyer les `Like`, `Review` et `Annotation` associés en transaction.
