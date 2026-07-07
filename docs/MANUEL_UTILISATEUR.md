# Manuel d'utilisation — OPTIQ

OPTIQ est un réseau social dédié à la photographie. Il permet de partager ses photos, de recevoir des critiques visuelles annotées directement sur l'image, et de découvrir le travail d'autres photographes.

Ce manuel explique comment utiliser toutes les fonctionnalités de la plateforme, étape par étape.

**Accès à l'application** : https://optiq-app.vercel.app

---

## Sommaire

1. [Créer un compte](#1-créer-un-compte)
2. [Se connecter et se déconnecter](#2-se-connecter-et-se-déconnecter)
3. [Naviguer dans le feed](#3-naviguer-dans-le-feed)
4. [Publier une photo](#4-publier-une-photo)
5. [Voir le détail d'une photo](#5-voir-le-détail-dune-photo)
6. [Écrire une critique avec annotations](#6-écrire-une-critique-avec-annotations)
7. [Liker une photo](#7-liker-une-photo)
8. [Gérer son profil](#8-gérer-son-profil)
9. [Modifier les paramètres du compte](#9-modifier-les-paramètres-du-compte)
10. [S'abonner à d'autres photographes](#10-sabonner-à-dautres-photographes)
11. [Gérer les notifications](#11-gérer-les-notifications)
12. [Explorer les meilleures photos](#12-explorer-les-meilleures-photos)
13. [Rechercher un photographe](#13-rechercher-un-photographe)

---

## 1. Créer un compte

Pour accéder aux fonctionnalités d'OPTIQ (publier, critiquer, s'abonner), il faut d'abord créer un compte.

1. Cliquer sur **"Inscription"** dans la barre de navigation en haut à droite
2. Remplir le formulaire :
   - **Email** : votre adresse email (elle servira à vous connecter)
   - **Nom d'utilisateur** : le nom qui s'affichera sur votre profil et vos critiques
   - **Mot de passe** : choisissez un mot de passe suffisamment solide
3. Cliquer sur **"Créer mon compte"**

Une fois le compte créé, vous êtes automatiquement connecté et redirigé vers le feed.

> Le mot de passe est chiffré (bcrypt) avant d'être stocké — il n'est jamais accessible en clair, même par les administrateurs.

---

## 2. Se connecter et se déconnecter

### Connexion

1. Cliquer sur **"Connexion"** dans la navbar
2. Entrer votre email et votre mot de passe
3. Cliquer sur **"Se connecter"**

La session est conservée même si vous fermez le navigateur — vous n'avez pas besoin de vous reconnecter à chaque visite.

### Déconnexion

Cliquer sur l'icône de porte (→) en haut à droite de la navbar. Vous êtes immédiatement déconnecté.

---

## 3. Naviguer dans le feed

La page d'accueil affiche toutes les photos publiées sur la plateforme, triées de la plus récente à la plus ancienne.

Chaque carte affiche :
- La photo
- Le titre et la description (tronquée si trop longue)
- Les métadonnées techniques (appareil, ISO, ouverture…) sous forme de badges
- Le nom de l'auteur (cliquable → vers son profil)
- Le nombre de likes et de critiques

### Filtres avancés

Cliquer sur **"Filtres avancés"** pour affiner l'affichage :

| Filtre | Ce qu'il fait |
|---|---|
| Appareil photo | Affiche uniquement les photos prises avec cet appareil |
| Objectif | Filtre par modèle d'objectif |
| ISO minimum / maximum | Filtre par plage de sensibilité ISO |

Cliquer sur **"Rechercher"** pour appliquer les filtres, et **"Réinitialiser"** pour tout effacer.

Un point blanc sur le bouton "Filtres avancés" indique qu'un filtre est actif.

---

## 4. Publier une photo

1. Cliquer sur **"Nouvelle Photo"** dans la navbar (disponible uniquement si vous êtes connecté)
2. Glisser-déposer votre photo ou cliquer pour la sélectionner depuis votre ordinateur
3. Remplir le formulaire :
   - **Titre** (obligatoire)
   - **Description** (optionnelle)
   - **Appareil photo** : choisir dans la liste déroulante, ou sélectionner "Autre appareil (préciser...)" pour saisir manuellement
4. Cliquer sur **"Publier"**

### Métadonnées EXIF

Si votre photo contient des données EXIF (la plupart des appareils photos et smartphones les intègrent), OPTIQ les extrait automatiquement :

- ISO
- Ouverture (f/)
- Vitesse d'obturation
- Focale (mm)
- Modèle d'objectif

Ces informations s'afficheront sous forme de badges sur votre photo. Si vous avez sélectionné un appareil dans la liste, ce choix est prioritaire sur les données EXIF.

> Taille maximale acceptée : **50 Mo** par image.

---

## 5. Voir le détail d'une photo

Cliquer sur une photo (depuis le feed, un profil ou la page Explore) pour accéder à sa page de détail.

La page est organisée en deux colonnes :

**Colonne gauche — la photo**
- L'image est affichée sur un canvas interactif
- Si vous souhaitez écrire une critique, les outils de dessin se trouvent ici (voir section 6)

**Colonne droite — les informations**
- Panneau des données techniques (masqué si aucune donnée EXIF disponible)
- Liste des critiques laissées par la communauté
- Formulaire pour écrire une critique

### Données techniques

Les badges techniques (ISO, ouverture, vitesse…) affichent une explication pédagogique au survol. Par exemple, survoler le badge "Vitesse" explique comment la vitesse d'obturation influe sur le flou de mouvement.

### Supprimer sa photo

Si vous êtes le propriétaire de la photo, un bouton **"Supprimer"** est visible en haut de la page. Un premier clic passe le bouton en rouge ("Confirmer la suppression") — un deuxième clic est nécessaire pour confirmer. Cette protection évite les suppressions accidentelles.

---

## 6. Écrire une critique avec annotations

C'est la fonctionnalité centrale d'OPTIQ : vous pouvez annoter directement la photo pour pointer des éléments précis.

### Étape 1 — Activer le mode dessin

Cliquer sur le bouton **"Mode dessin"** au-dessus de la photo. Deux outils apparaissent :

- **Rectangle** : cliquer-glisser pour délimiter une zone
- **Forme libre** : tracer un contour à main levée en maintenant le clic

### Étape 2 — Dessiner vos annotations

Chaque annotation reçoit automatiquement une couleur différente dans cet ordre : rouge, vert, bleu, ambre, violet, rose. Vous pouvez ajouter jusqu'à 6 annotations par critique.

Les pastilles colorées à droite du bouton "Mode dessin" représentent vos annotations. Pour supprimer une annotation, cliquer sur sa pastille.

### Étape 3 — Écrire le commentaire

Remplir le champ texte sous la photo avec votre critique écrite. Ce texte accompagne les annotations visuelles.

### Étape 4 — Publier

Cliquer sur **"Publier la critique"**. Votre critique apparaît dans la liste avec une miniature de la photo affichant vos annotations.

### Supprimer une critique

Survoler votre critique pour faire apparaître le bouton **×**. Cliquer dessus pour la supprimer. Seul l'auteur de la critique peut la supprimer.

---

## 7. Liker une photo

Cliquer sur l'icône cœur sur n'importe quelle photo (dans le feed, sur un profil, sur la page d'une photo ou dans la page Explore).

- Un clic ajoute votre like
- Un second clic le retire

Le compteur se met à jour immédiatement. Vous devez être connecté pour liker.

---

## 8. Gérer son profil

Cliquer sur votre nom d'utilisateur dans la navbar pour accéder à votre profil.

La page de profil affiche :
- Votre avatar et votre nom d'utilisateur
- Votre bio
- Vos compteurs : photos publiées, abonnés, abonnements
- La grille de toutes vos photos

Cliquer sur le nom d'un autre utilisateur (depuis une photo ou une critique) pour accéder à son profil.

### Profils privés

Si un utilisateur a activé le mode privé, ses photos ne sont visibles que par ses abonnés. Vous verrez le message "Ce compte est privé" à la place de la grille de photos.

---

## 9. Modifier les paramètres du compte

Cliquer sur **votre nom d'utilisateur** dans la navbar, puis sur **"Modifier le profil"** (ou accéder directement à `/settings`).

Vous pouvez modifier :

| Paramètre | Description |
|---|---|
| Photo de profil | Coller l'URL d'une image — la prévisualisation se met à jour en direct |
| Bio | Texte libre de présentation (300 caractères maximum) |
| Confidentialité | Basculer entre **Public** (tout le monde voit vos photos) et **Privé** (abonnés uniquement) |

Cliquer sur **"Enregistrer les modifications"** pour sauvegarder. Vous êtes redirigé vers votre profil après quelques secondes.

---

## 10. S'abonner à d'autres photographes

Depuis le profil d'un utilisateur, cliquer sur le bouton d'action :

### Compte public
- Cliquer sur **"S'abonner"** → vous êtes immédiatement abonné
- Le bouton devient **"Abonné"**
- Re-cliquer pour se désabonner

### Compte privé
- Cliquer sur **"S'abonner"** → une demande est envoyée à l'utilisateur
- Le bouton devient **"En attente"** (couleur ambre)
- Re-cliquer sur **"En attente"** pour annuler la demande
- Si l'utilisateur accepte votre demande, vous devenez automatiquement abonné et recevez une notification

---

## 11. Gérer les notifications

L'icône de cloche dans la navbar affiche un badge rouge lorsque vous avez des notifications non lues.

Cliquer sur la cloche pour ouvrir le panneau, qui contient deux onglets :

### Onglet "Notifications"

Liste de vos notifications récentes :
- Demandes d'abonnement reçues
- Demandes d'abonnement acceptées

Cliquer sur une notification redirige vers le profil concerné. Cliquer sur **"Tout marquer comme lu"** efface le badge rouge.

### Onglet "Demandes"

Liste des demandes d'abonnement en attente de votre validation. Pour chaque demande :
- Cliquer sur **"Accepter"** pour autoriser l'abonnement
- Cliquer sur **"Refuser"** pour rejeter la demande discrètement (la personne n'est pas notifiée)

---

## 12. Explorer les meilleures photos

Cliquer sur **"Explorer"** dans la navbar pour accéder au tableau d'honneur.

Cette page affiche les **20 meilleures photos des 7 derniers jours**, classées par popularité. Le classement tient compte du nombre de "perfect" (votes de qualité) puis du nombre de likes.

Les 3 premières photos reçoivent un badge numéroté (1, 2, 3) en coin.

---

## 13. Rechercher un photographe

En haut de la page Explore, une barre de recherche permet de trouver un utilisateur par son nom d'utilisateur.

Commencer à taper — les suggestions apparaissent automatiquement après quelques caractères. Cliquer sur un résultat pour accéder à son profil.

---

## Questions fréquentes

**Je ne vois pas les photos d'un utilisateur.**
Son compte est probablement privé. Vous devez être abonné pour accéder à son contenu.

**Mes données EXIF ne s'affichent pas.**
Certains appareils ou logiciels de traitement suppriment les métadonnées EXIF. Vous pouvez toujours renseigner l'appareil manuellement dans le formulaire d'upload.

**Comment supprimer mon compte ?**
La suppression de compte n'est pas encore disponible depuis l'interface. Contactez l'administrateur de la plateforme.

**La photo que j'ai uploadée ne s'affiche pas.**
Vérifiez que le fichier est bien au format JPEG, PNG, WebP, GIF ou HEIC et qu'il ne dépasse pas 50 Mo.
