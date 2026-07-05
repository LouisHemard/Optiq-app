# Charte graphique OPTIQ

Guide visuel pour aligner les supports de soutenance (diaporama, affiches, documentation) sur l’interface de l’application.

> **Stack UI** : Tailwind CSS 4 (palette par défaut) + Lucide React (icônes)  
> **Thème** : mode sombre uniquement — fond anthracite, accent indigo, touches dorées sur Explore

---

## 1. Identité

| Élément | Valeur |
|---|---|
| **Nom** | OPTIQ |
| **Baseline suggérée** | Plateforme de critique photo |
| **Ton** | Technique, communautaire, sobre — inspiré des interfaces photo pro (Lightroom, Capture One) |
| **Ambiance** | Dark mode premium, cartes en relief léger, bordures discrètes |

---

## 2. Palette de couleurs

### 2.1 Couleurs principales (à utiliser en priorité sur les slides)

| Rôle | Nom Tailwind | HEX | Usage dans l’app |
|---|---|---|---|
| **Fond page** | `gray-900` | `#111827` | Arrière-plan global (`bg-gray-900`) |
| **Surface / carte** | `gray-800` | `#1F2937` | Cartes photo, formulaires (`bg-gray-800/80`) |
| **Surface profonde** | `gray-900` | `#111827` | Champs de saisie, zones canvas |
| **Bordure** | `gray-700` | `#374151` | Contours cartes, inputs, navbar |
| **Bordure légère** | `gray-800` | `#1F2937` | Séparateur navbar |
| **Accent principal** | `indigo-600` | `#4F46E5` | Boutons primaires (Connexion, Publier, S’abonner) |
| **Accent hover** | `indigo-500` | `#6366F1` | Survol des boutons primaires |
| **Liens** | `indigo-400` | `#818CF8` | Liens texte, profils, CTA secondaires |
| **Texte principal** | `white` | `#FFFFFF` | Titres, noms, contenus importants |
| **Texte secondaire** | `gray-400` | `#9CA3AF` | Sous-titres, descriptions, EXIF |
| **Texte tertiaire** | `gray-500` | `#6B7280` | Placeholders, métadonnées |
| **Labels formulaire** | `gray-300` | `#D1D5DB` | Labels des champs |

### 2.2 Couleurs sémantiques (états & feedback)

| Rôle | Nom Tailwind | HEX | Usage |
|---|---|---|---|
| **Succès** | `green-400` | `#4ADE80` | Message « Modifications enregistrées » |
| **Erreur** | `red-400` | `#F87171` | Erreurs formulaire, suppression |
| **Erreur fond** | `red-500/10` | `#EF4444` à 10 % | Bandeau d’alerte |
| **Like / cœur** | `red-500` | `#EF4444` | Bouton j’aime actif |
| **Explore / or** | `yellow-400` | `#FACC15` | Icônes trophée, lien Explorer |
| **Badge podium** | `yellow-500` | `#EAB308` | Pastilles 1, 2, 3 (fond) + texte noir |
| **En attente** | `amber-400` | `#FBBF24` | Bouton « En attente » (follow privé) |
| **Notification** | `red-500` | `#EF4444` | Badge compteur cloche |
| **Focus clavier** | `indigo-500` | `#6366F1` | Anneau focus (`ring-2`) |

### 2.3 Couleurs des annotations (critiques visuelles)

Utilisées sur le canvas et les miniatures — utiles pour une slide « fonctionnalité annotations » :

| # | HEX | Nom |
|---|---|---|
| 1 | `#EF4444` | Rouge |
| 2 | `#22C55E` | Vert |
| 3 | `#3B82F6` | Bleu |
| 4 | `#F59E0B` | Ambre |
| 5 | `#A855F7` | Violet |
| 6 | `#EC4899` | Rose |

### 2.4 Dégradés & effets

| Effet | Valeur CSS / classe | Usage |
|---|---|---|
| Navbar floue | `bg-gray-900/95` + `backdrop-blur-sm` | Barre de navigation sticky |
| Ombre dropdown | `shadow-2xl shadow-black/40` | Menu notifications, recherche |
| Ombre carte hover | `hover:shadow-lg hover:shadow-black/20` | PhotoCard au survol |
| Canvas photo | `bg-black` | Zone d’annotation plein écran |

---

## 3. Typographie

L’application utilise la **police système** par défaut de Tailwind (équivalent à la stack navigateur) :

```css
font-family: ui-sans-serif, system-ui, sans-serif,
  "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

### Recommandations pour les slides

| Police slide (proche de l’app) | Poids | Usage |
|---|---|---|
| **Inter** ou **SF Pro** / **Segoe UI** | Bold (700) | Titres de slide, logo OPTIQ |
| Même famille | Medium (500) | Sous-titres, labels |
| Même famille | Regular (400) | Corps de texte |

### Hiérarchie (reprise de l’UI)

| Niveau | Taille app | Équivalent slide |
|---|---|---|
| Titre page (H1) | `text-3xl` (30 px) bold white | 32–40 pt, blanc |
| Titre section (H2) | `text-2xl` (24 px) bold white | 24–28 pt, blanc |
| Sous-titre | `text-sm` gray-400 | 14–16 pt, `#9CA3AF` |
| Corps | `text-sm` gray-200/300 | 14–18 pt, `#D1D5DB` |
| Légende / EXIF | `text-xs` gray-500 | 11–12 pt, `#6B7280` |
| Logo navbar | `text-xl` bold | 22–26 pt, tracking serré |

**Letter-spacing logo** : `tracking-tight` sur « OPTIQ ».

---

## 4. Composants UI (à reproduire sur les slides)

### 4.1 Boutons

| Type | Fond | Texte | Bordure | Rayon |
|---|---|---|---|---|
| **Primaire** | `#4F46E5` | Blanc | — | 12 px (`rounded-xl`) |
| **Secondaire** | `#1F2937` | `#D1D5DB` | `#374151` 1 px | 8 px (`rounded-lg`) |
| **Danger** | `#1F2937` → hover `#7F1D1D` 30 % | `#F87171` | `#991B1B` | 8 px |
| **Explore** | — | `#FACC15` | — | — (lien texte + icône) |

Padding type : `px-4 py-2` (boutons navbar) ou `px-4 py-3` (formulaires).

### 4.2 Cartes

```
Fond      : #1F2937 (ou #1F2937 à 80 % d’opacité)
Bordure   : 1 px solid #374151
Rayon     : 12 px (rounded-xl) ou 16 px (rounded-2xl pour formulaires)
Padding   : 16–24 px
```

### 4.3 Champs de formulaire

```
Fond        : #111827
Bordure     : 1 px #4B5563
Texte       : #FFFFFF
Placeholder : #6B7280
Focus       : anneau 2 px #6366F1
Rayon       : 12 px
```

### 4.4 Badges & pastilles

| Élément | Style |
|---|---|
| EXIF | Fond `#374151` 80 %, texte `#D1D5DB`, icône Lucide, `rounded-md`, petit padding |
| Privé | Fond `#374151`, texte `#9CA3AF`, `rounded-full`, `text-xs` |
| Podium 1–3 | Cercle `#EAB308`, texte noir bold, ombre portée |
| Notif non lue | Point `#6366F1` (indigo) ou badge `#EF4444` |

---

## 5. Iconographie

- **Bibliothèque** : [Lucide Icons](https://lucide.dev) (style ligne, stroke 2 px)
- **Couleur par défaut** : `#9CA3AF` (gray-400) ou `#818CF8` (indigo-400) pour les accents
- **Icônes clés du produit** :
  - `Camera`, `Aperture` — EXIF
  - `Heart` — likes
  - `Trophy` — Explore (jaune `#FACC15`)
  - `Bell` — notifications
  - `Upload` — publication
  - `Pencil`, `Square`, `PenLine` — annotations

Sur les slides : utiliser la même famille (Lucide export SVG) ou des pictos ligne simples, jamais du flat coloré incompatible.

---

## 6. Mise en page & espacements

| Token | Valeur | Usage |
|---|---|---|
| Padding page | `p-6` (24 px) | Marges contenu |
| Gap grille photos | `gap-6` (24 px) | Grille 3 colonnes |
| Navbar hauteur | `py-4` + contenu | ~56–64 px |
| Max width contenu photo | `max-w-7xl` (1280 px) | Page détail |
| Ratio vignette | `aspect-[4/3]` | Cartes feed |

**Grille recommandée slides** : fond plein `#111827`, cartes ou blocs `#1F2937` avec bordure `#374151`, marges généreuses (comme l’app).

---

## 7. Modèles de slides (recettes rapides)

### Slide titre

```
Fond           : #111827 (plein écran)
Titre          : OPTIQ — blanc, bold, 44 pt, tracking tight
Sous-titre     : #9CA3AF, 18 pt
Accent         : ligne ou bandeau #4F46E5 (4 px de hauteur)
Optionnel      : icône Camera ou Aperture en #818CF8
```

### Slide contenu (standard)

```
Fond           : #111827
Titre slide    : blanc, 28–32 pt bold
Corps          : #D1D5DB, 16–18 pt
Encadré        : fond #1F2937, bordure #374151, coins 12 px
Puces / chiffres : #4F46E5 ou #818CF8
```

### Slide « fonctionnalité » (avec capture d’écran)

```
Fond slide     : #111827
Cadre capture  : bordure 1 px #374151, radius 12 px, ombre 0 25px rgba(0,0,0,0.4)
Légende        : #6B7280, 12 pt
```

### Slide Explore / Hall of fame

```
Accent or      : #FACC15 pour titres ou icônes trophée
Texte          : blanc + #9CA3AF
Badges 1-2-3   : cercles #EAB308, chiffre noir
```

---

## 8. Export pour PowerPoint / Google Slides / Keynote

### Thème de couleurs personnalisées (à créer une fois)

| Nom dans le thème | HEX |
|---|---|
| Fond | `#111827` |
| Surface | `#1F2937` |
| Bordure | `#374151` |
| Accent | `#4F46E5` |
| Accent clair | `#818CF8` |
| Texte | `#FFFFFF` |
| Texte secondaire | `#9CA3AF` |
| Succès | `#4ADE80` |
| Erreur | `#F87171` |
| Or Explore | `#FACC15` |

### Google Slides

1. **Fichier → Thème → Couleurs → Personnaliser**
2. Coller les HEX ci-dessus dans Arrière-plan, Texte, Liens, Accent
3. Police : **Inter** (ou Arial si indisponible)

### PowerPoint

1. **Création → Couleurs → Personnaliser les couleurs du thème**
2. Remplacer Texte/Accent/Fond par la table §8
3. **Création → Polices** : titres et corps en Inter

### Keynote

1. **Format → Objet de mise en forme → Remplissage** avec les HEX
2. Enregistrer un **modèle de diapositive** fond `#111827` + zone titre

---

## 9. À éviter (incohérences avec l’app)

- Fond blanc ou clair (l’app est 100 % dark)
- Violet autre qu’indigo Tailwind (pas de #646cff Vite par défaut sur les slides)
- Polices serif ou display fantaisie
- Dégradés multicolores flashy — l’UI reste plate et sobre
- Ombres colorées — uniquement `shadow-black/20` à `shadow-black/40`

---

## 10. Ressources

- Captures d’écran : lancer `npm run dev` dans `client/` → http://localhost:5173
- Icônes SVG : https://lucide.dev/icons/
- Vérificateur contraste (accessibilité) : fond `#111827` + texte `#9CA3AF` ≈ ratio 5.5:1 (AA pour texte large)

---

*Document généré à partir du code source `client/src` (Tailwind 4, composants React).*
