# Cahier de recettes — OPTIQ

J'ai testé l'ensemble des fonctionnalités de l'application directement en production, soit via des requêtes API, soit en naviguant manuellement sur le site. Ce document retrace tous les scénarios testés et leurs résultats.

**Environnement testé**
- Frontend : https://optiq-app.vercel.app
- Backend : https://optiq-backend-ex6o.onrender.com
- Date des tests : 07/07/2026

**Compte utilisé**
J'ai créé un compte de test dédié (`recette_test@optiq.fr`) pour effectuer les tests dans un environnement propre, sans polluer les données existantes.

---

OK — fonctionne comme prévu  
KO — comportement incorrect, bug identifié

---

## 1. Authentification

L'authentification est la porte d'entrée de l'app. J'ai vérifié que l'inscription, la connexion et la gestion de session fonctionnent correctement, y compris les cas d'erreur.

### Inscription

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 01 | Inscription valide | Créer un compte avec email + username + mot de passe | Compte créé, mot de passe jamais stocké en clair | Utilisateur créé avec mot de passe hashé : `"$2a$10$..."` | OK |
| 02 | Email déjà utilisé | Réutiliser un email existant | Message d'erreur clair, pas de doublon en base | `"Un compte existe déjà avec cet email ou ce nom d'utilisateur."` | OK |
| 03 | Formulaire incomplet | Valider sans remplir tous les champs | Les champs manquants sont mis en évidence | Validation native du navigateur, soumission bloquée | OK |

### Connexion

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 04 | Connexion valide | Se connecter avec les bons identifiants | JWT + données utilisateur retournés (sans le mot de passe) | Token JWT valide + `{id, email, username, avatarUrl}` | OK |
| 05 | Mauvais mot de passe | Entrer un mot de passe incorrect | Message d'erreur sans préciser si c'est l'email ou le mdp | `"Email ou mot de passe incorrect."` — intentionnellement vague | OK |
| 06 | Email inconnu | Tenter de se connecter avec un email qui n'existe pas | Même message qu'un mauvais mot de passe | Réponse identique au test 05 — aucune fuite d'information | OK |

### Session

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 07 | Persistance de session | Fermer et rouvrir le navigateur après connexion | Toujours connecté, pas besoin de se reconnecter | Session restaurée automatiquement depuis le localStorage | OK |
| 08 | Déconnexion | Cliquer sur l'icône de déconnexion dans la navbar | Session terminée, redirection vers la page de connexion | Token supprimé, état vidé, redirection immédiate | OK |

---

## 2. Feed d'accueil et filtres

La page d'accueil affiche toutes les photos postées sur la plateforme. J'ai vérifié le chargement et les filtres avancés.

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 09 | Chargement du feed | Ouvrir la page d'accueil | Grille de photos, triées de la plus récente à la plus ancienne | Photos chargées dans le bon ordre avec auteurs et compteurs | OK |
| 10 | Filtre par appareil | Filtrer par "Sony" | Uniquement les photos prises avec un Sony | Filtrage insensible à la casse, résultats corrects | OK |
| 11 | Filtre par plage ISO | Filtrer avec ISO min 100, max 800 | Uniquement les photos dans cette plage | Photos filtrées correctement côté base de données | OK |
| 12 | Affichage des badges EXIF | Voir une photo avec données techniques | Badges (ISO, ouverture, vitesse…) visibles avec tooltips | Tooltips pédagogiques au survol sur chaque badge | OK |
| 13 | Réinitialisation des filtres | Activer un filtre puis cliquer "Réinitialiser" | Retour au feed complet | Filtres effacés, feed rechargé, indicateur disparu | OK |

---

## 3. Page Explore

La page Explore est un tableau d'honneur qui met en avant les meilleures photos de la semaine.

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 14 | Algorithme de classement | Ouvrir `/explore` | 20 photos des 7 derniers jours, triées par popularité | Photos triées par perfectCount puis par likes — algorithme correct | OK |
| 15 | Badges podium | Regarder les 3 premières photos | Badges 1, 2, 3 affichés en coin | Badges dorés visibles sur les 3 premières cartes | OK |
| 16 | Recherche d'utilisateurs | Taper un nom dans la barre de recherche | Suggestions en temps réel | Résultats corrects, clic sur un résultat → page profil | OK |
| 17 | Debounce de la recherche | Taper rapidement | L'API n'est appelée qu'après une pause de 300ms | Pas de spam de requêtes, expérience fluide | OK |

---

## 4. Upload de photo

J'ai testé le formulaire d'upload, l'extraction automatique des métadonnées EXIF et le stockage sur Supabase.

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 18 | Accès sans connexion | Aller sur `/upload` sans être connecté | Formulaire masqué, bouton "Se connecter" | Page protégée, redirection proposée | OK |
| 19 | Upload valide | Choisir une image JPEG, remplir le titre et valider | Photo créée et visible dans le feed | Image uploadée sur Supabase, URL stockée en base | OK |
| 20 | Extraction EXIF automatique | Uploader une photo avec métadonnées | ISO, ouverture, vitesse extraits sans saisie manuelle | Champs EXIF remplis automatiquement à partir du fichier | OK |
| 21 | Choix de l'appareil | Sélectionner un modèle dans le menu déroulant | Le modèle est enregistré et affiché sur la photo | Champ `cameraModel` stocké, prioritaire sur les EXIF | OK |
| 22 | Fichier trop lourd | Tenter d'envoyer un fichier de plus de 50 Mo | Erreur, fichier refusé | Limite 50 Mo active côté serveur (Multer) | OK |

---

## 5. Page d'une photo

La page d'une photo regroupe le canvas de dessin, le panneau EXIF et les critiques. C'est la page la plus complexe de l'application.

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 23 | Chargement de la page | Ouvrir `/photo/:id` | Tous les éléments chargés : image, EXIF, critiques | Photo avec auteur, compteurs, panneau EXIF et liste des critiques | OK |
| 24 | Tooltips EXIF | Survoler un badge technique | Explication pédagogique affichée | Tooltip avec titre et description (ex : "Ouverture : contrôle la profondeur de champ") | OK |
| 25 | Bouton supprimer visible | Voir sa propre photo | Bouton "Supprimer" présent | Bouton affiché uniquement au propriétaire de la photo | OK |
| 26 | Confirmation en deux clics | Premier clic sur "Supprimer" | Le bouton passe en rouge avant de supprimer | Deuxième clic requis, évite les suppressions accidentelles | OK |
| 27 | Bouton absent pour les autres | Voir la photo de quelqu'un d'autre | Pas de bouton "Supprimer" | Bouton absent — vérification d'ownership côté frontend et backend | OK |

---

## 6. Likes

Le système de like est conçu pour être réactif : l'interface se met à jour immédiatement, avant même que le serveur ait répondu.

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 28 | Liker une photo | Cliquer sur le cœur | Compteur incrémenté, cœur plein | `{"liked":true,"likesCount":2}` — mise à jour immédiate | OK |
| 29 | Retirer un like | Re-cliquer sur le cœur | Compteur décrémenté, cœur vide | `{"liked":false,"likesCount":1}` — fonctionnement toggle | OK |
| 30 | Mise à jour optimiste | Observer le cœur au moment du clic | L'interface réagit instantanément | Changement visible avant la réponse de l'API | OK |
| 31 | Rollback si erreur réseau | Couper le réseau et cliquer le cœur | Retour à l'état précédent si l'API échoue | State local restauré automatiquement | OK |

---

## 7. Critiques visuelles et annotations

C'est la fonctionnalité centrale d'OPTIQ : pouvoir dessiner directement sur une photo pour pointer des éléments précis lors d'une critique.

### Création

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 32 | Critique sans dessin | Écrire un commentaire et soumettre | Critique créée avec `annotations: []` | `{"content":"Beau cadrage...","annotations":[]}` | OK |
| 33 | Critique avec annotation | Dessiner un rectangle sur la photo + écrire un commentaire | Critique créée avec l'annotation intégrée | Annotation stockée avec coordonnées normalisées et couleur | OK |
| 34 | Cycle de couleurs | Dessiner plusieurs annotations | Couleurs différentes à chaque annotation : rouge, vert, bleu, ambre, violet, rose | Cycle de 6 couleurs respecté automatiquement | OK |
| 35 | Outil rectangle | Activer le mode dessin, cliquer-glisser | Zone rectangulaire semi-transparente dessinée | Canvas Konva réactif, remplissage visible | OK |
| 36 | Forme libre | Tracer un contour à main levée | Forme simplifiée, fermée et remplie | Algorithme de simplification (Ramer-Douglas-Peucker) appliqué, résultat propre | OK |

### Suppression

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 37 | Supprimer sa propre critique | Cliquer le × sur sa critique | Critique supprimée | Critique retirée de la liste immédiatement | OK |
| 38 | Supprimer celle de quelqu'un d'autre | Tenter via l'API avec un autre token | Refus 403 | `{"message":"Forbidden","statusCode":403}` — protection côté backend | OK |
| 39 | Bouton × au survol | Passer la souris sur sa critique | × visible uniquement sur les siennes, uniquement au survol | Comportement discret et ciblé | OK |

---

## 8. Profil utilisateur

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 40 | Profil public | Visiter le profil d'un autre utilisateur | Photos visibles, compteurs affichés, bouton "S'abonner" | Profil complet chargé correctement | OK |
| 41 | Profil privé (non abonné) | Visiter un profil privé sans être abonné | Photos masquées, message "Ce compte est privé" | `photos: []` retourné par l'API, message affiché côté UI | OK |
| 42 | Mon propre profil | Visiter son propre profil | Bouton "Modifier le profil" à la place de "S'abonner" | `isOwner: true` retourné par l'API, bouton conditionnel | OK |

---

## 9. Paramètres du compte

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 43 | Mise à jour de la bio | Modifier la bio et sauvegarder | Bio mise à jour, message de confirmation | `"Photographe amateur passionné."` sauvegardé, redirection vers le profil | OK |
| 44 | Passer en compte privé | Activer le toggle "Privé" | Compte passé en privé, photos masquées pour les non-abonnés | `isPrivate: true` en base, comportement correct | OK |
| 45 | Mise à jour de l'avatar | Coller une URL d'image | Prévisualisation en direct, avatar mis à jour dans la navbar | Mise à jour immédiate dans l'AuthContext | OK |
| 46 | Accès sans connexion | Aller sur `/settings` sans être connecté | Redirection vers la page de connexion | Page protégée, redirection automatique | OK |

---

## 10. Système d'abonnements

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 47 | Suivre un compte public | Cliquer "S'abonner" sur un profil public | `{"status":"following"}` — abonnement immédiat | Abonnement effectif, bouton devient "Abonné" | OK |
| 48 | Envoyer une demande (compte privé) | Cliquer "S'abonner" sur un profil privé | `{"status":"requested"}` + notification envoyée à la cible | `{"status":"requested"}` — demande créée, notification reçue | OK |
| 49 | Annuler une demande | Re-cliquer sur "En attente" | Demande supprimée, bouton revient à "S'abonner" | `{"status":"request_cancelled"}` | OK |
| 50 | Se suivre soi-même | Essayer de s'abonner à son propre profil | Erreur explicite | `"Vous ne pouvez pas vous suivre vous-même."` (409) | OK |
| 51 | Accepter une demande | Cliquer "Accepter" dans le dropdown notifications | Relation créée + notification envoyée au demandeur | Transaction atomique : follow + suppression demande + notification | OK |
| 52 | Refuser une demande | Cliquer "Refuser" | Demande supprimée discrètement, pas de notification | Demande retirée de la liste, aucune notification envoyée | OK |

---

## 11. Notifications

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 53 | Liste des notifications | Ouvrir le dropdown cloche | Notifications triées par date, avec temps relatif | Liste chargée correctement (`"il y a 5 min"`, `"il y a 2h"`) | OK |
| 54 | Badge de notifications non lues | Recevoir une demande de follow | Badge rouge avec le bon compteur dans la navbar | Badge mis à jour automatiquement (polling toutes les 30s) | OK |
| 55 | Tout marquer comme lu | Cliquer "Tout marquer comme lu" | Badge disparaît | Badge supprimé, notifications passées en lues | OK |
| 56 | Onglet Demandes | Recevoir une demande de follow | Demande visible avec boutons Accepter / Refuser | Demandes affichées avec avatar et username du demandeur | OK |

---

## 12. Sécurité

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 57 | Accès sans token | Appeler une route protégée sans header Authorization | 401 Unauthorized | `{"message":"Unauthorized","statusCode":401}` | OK |
| 58 | Token forgé | Envoyer un JWT fabriqué à la main | 401 Unauthorized | Guard JWT rejette le token immédiatement | OK |
| 59 | En-têtes de sécurité | Inspecter les headers de la réponse | Headers Helmet présents | `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security` actifs | OK |
| 60 | Rate limiting | Envoyer beaucoup de requêtes en rafale | 429 Too Many Requests | ThrottlerGuard bloque les abus après le seuil configuré | OK |

---

## 13. Navigation et UX

| # | Ce qu'on teste | Comment | Ce qu'on attend | Ce qu'on a eu | Résultat |
|---|---|---|---|---|---|
| 61 | Navbar connecté | Se connecter et regarder la navbar | "Nouvelle Photo", cloche, username et déconnexion visibles | Tous les liens affichés selon l'état d'authentification | OK |
| 62 | Navbar non connecté | Naviguer sans token | "Connexion" et "Inscription" uniquement | Liens conditionnels, aucun lien protégé visible | OK |
| 63 | Clic sur l'auteur d'une photo | Cliquer sur le nom de l'auteur dans une carte | Redirection vers son profil, sans ouvrir la photo | `stopPropagation()` gère le conflit avec le lien parent | OK |
| 64 | Confirmation avant suppression | Premier clic sur "Supprimer" une photo | Le bouton passe en rouge, demande confirmation | Deuxième clic requis — aucune suppression accidentelle possible | OK |

---

## Bilan

**64 scénarios testés — 64 conformes.**

| Fonctionnalité | Tests | Conformes |
|---|---|---|
| Authentification | 8 | 8 OK |
| Feed & filtres | 5 | 5 OK |
| Explore | 4 | 4 OK |
| Upload | 5 | 5 OK |
| Page photo | 5 | 5 OK |
| Likes | 4 | 4 OK |
| Critiques & annotations | 8 | 8 OK |
| Profil utilisateur | 3 | 3 OK |
| Paramètres | 4 | 4 OK |
| Abonnements | 6 | 6 OK |
| Notifications | 4 | 4 OK |
| Sécurité | 4 | 4 OK |
| Navigation & UX | 4 | 4 OK |
| **Total** | **64** | **64 OK** |

---

## Bugs rencontrés et corrigés

Voici les problèmes identifiés pendant le développement et les corrections apportées.

| # | Problème | Gravité | Solution | Statut |
|---|---|---|---|---|
| B01 | Le serveur ne démarrait pas sur Render : `Cannot find module 'dist/main'` | Bloquant | Chemin corrigé : `node dist/src/main` dans `package.json` | Corrigé |
| B02 | `bcrypt` incompatible avec Node.js 24 à cause des bindings natifs | Bloquant | Remplacement par `bcryptjs@2.4.3`, version purement JavaScript | Corrigé |
| B03 | Colonne `isPrivate` absente en base de données au démarrage | Bloquant | Migration SQL créée pour aligner le schéma Prisma avec la base Supabase | Corrigé |
| B04 | Les tests mockaient `bcrypt` après le passage à `bcryptjs` | Mineur | `jest.mock('bcrypt')` corrigé en `jest.mock('bcryptjs')` | Corrigé |
| B05 | Images bloquées par la politique CORS lors du rendu sur le canvas Konva | Modéré | Ajout de `crossOriginResourcePolicy: 'cross-origin'` dans la config Helmet | Corrigé |
