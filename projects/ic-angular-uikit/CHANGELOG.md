# Journal des versions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation [SemVer](https://semver.org/lang/fr/)
(en 0.x, une version mineure peut contenir des changements incompatibles).

## [0.3.0] — 2026-11-24

### Ajouté

- `ui-file-manager` : gestionnaire de fichiers — dossiers et fil d'Ariane, vignettes ou liste détaillée, recherche
  et tri, sélection simple ou multiple (souris et clavier, motif ARIA « listbox »), nouveau dossier, renommage,
  suppression confirmée, couper / coller et glisser-déposer, envoi par bouton ou dépôt avec progression et
  annulation, menu contextuel, filtre `accept`, lecture seule.
- `ui-file-picker` : champ de formulaire pour choisir un ou plusieurs fichiers ou médias dans une bibliothèque
  (dialogue `ui-file-manager`, envoi compris) ; éléments affichés en liste ou en vignettes, retrait, ordre
  modifiable (`reorderable`), `maxFiles`, `accept` ; valeur `UiFileEntry | null` ou tableau (`multiple`),
  compatible `formControl` / `ngModel` / `[(value)]` et `Validators.required`.
- `UiFileSource` : source de fichiers commune (`list` obligatoire, autres opérations facultatives) ;
  `uiHttpFileSource()` (API REST) et `uiMemoryFileSource()` (démonstrations, tests) ; `ui-file-icon`,
  `fileFamily()`, `entryMatchesAccept()`, `validateFileName()`.
- `ui-media-gallery` : galerie d'images et de vidéos (grille ou mosaïque, légendes) et visionneuse plein écran
  (précédent / suivant au clavier ou par balayage, préchargement des voisines, vidéos par `ui-media-player`, y
  compris YouTube / Vimeo, miniatures, retour du focus).
- `ui-media-picker` : choix d'une image ou d'une vidéo (bibliothèque ou adresse), texte alternatif obligatoire
  pour une image (sauf image décorative cochée), légende ; `pick()` renvoie une promesse.
- `ui-rich-text-editor` : bouton « Image ou vidéo » avec `[mediaSource]` (ou `[media]`), figures insérées après le
  paragraphe courant, retirées par leur bouton ou Retour arrière ; `insertMedia()`.
- Liste blanche HTML : option `media` (désactivée par défaut) de `parseRichText()`, `sanitizeRichText()`,
  `serializeRichText()` et `ui-rich-text` (`[media]`) — `figure > img | video` (+ `figcaption`), adresses http(s) ou
  relatives seulement, filtre `allowUrl` ; `createRichTextFigure()`, `safeRichTextMediaUrl()`.

### Modifié

- `ui-file-manager` : à l'ouverture d'un dossier au clavier, le focus passe au premier élément une fois le contenu
  chargé (il était perdu quand la source répondait de façon asynchrone).
- La valeur de l'éditeur ne se termine plus par un paragraphe vide (`<p><br></p>` après une ligne ou une figure).

### Documentation

- Onglet « Côté serveur » du gestionnaire de fichiers : API Symfony et Node.js (propriétaire vérifié, UUID v7,
  type réel des fichiers, SVG / HTML refusés, quota, `nosniff` + CSP `sandbox`, requêtes partielles), validées par
  un banc de 44 contrôles. Éditeur : variantes « médias » des nettoyeurs Symfony HtmlSanitizer et sanitize-html.

## [0.2.0] — 2026-11-23

### Ajouté

- `ui-context-menu` et `[uiContextMenuTrigger]` : menu contextuel (clic droit, appui long, clavier), sous-menus,
  éléments cochables, raccourcis, actions destructrices ; `openAt()` / `openFor()` pour un bouton « ⋯ ».
- `uiMenuItem` : `checked`, `checkMode`, `shortcut`, `keyshortcuts`, `tone` ; `ui-menu-separator`.
- `ui-rich-text-editor` : éditeur WYSIWYG (titres, citation, code, gras, italique, souligné, barré, listes, liens,
  ligne horizontale, historique), compatible formulaires et validation (`richTextMaxLength`).
- `ui-media-player` : musique et vidéos (fichiers avec sous-titres, vitesse, image dans l'image, plein écran ;
  YouTube / Vimeo chargés au clic et pilotés par messages), liste de lecture, répétition, formats alternatifs,
  clavier, Media Session.
- `ui-audio-visualizer` : 5 visualisations prédéfinies (barres, miroir, onde, cercle, égaliseur).
- `ui-mini-player` : lecteur miniature (barre d'application) suivant le lecteur actif (`UiMediaHub`).
- `ui-rich-text` et `sanitizeRichText()` / `parseRichText()` / `richTextToPlainText()` : affichage et nettoyage de HTML
  riche par liste blanche, sans `innerHTML`.
- `ui-chat` : conversation avec une IA. Réponse en flux rendue en Markdown sans `innerHTML` (titres, listes,
  tableaux, blocs de code avec bouton Copier, liens filtrés, images jamais chargées) ; Arrêter (Échap), régénérer,
  réessayer, copier, avis 👍 / 👎, suggestions, horodatage, emplacements d'en-tête et de saisie ; réponse complète
  annoncée aux lecteurs d'écran.
- Thème **`imperium-dark`** (Imperium Clan, néo-héroïque) : obsidienne `#0C0E14`, ardoise forgée `#151924`,
  or antique `#D4AF37`, saphir arcanique ; titres en Cinzel capitales, nom du clan en UnifrakturCook, interface en
  Inter, code en JetBrains Mono (polices à charger par l'application, par exemple avec @fontsource). Boutons, onglets,
  menus, cartes et dialogues habillés sans changer d'API ; champs, tableaux et listes restent sobres. Contrastes
  vérifiés (variantes « texte » pour le cramoisi et l'améthyste). Jetons `--ui-branch-*`, `--ui-ornament-color`,
  `--ui-font-family-display`, `--ui-font-family-blackletter`.
- Composants Imperium : `ui-ornament` (coin à volutes, nœud, fleuron, losange), `ui-arabesque-frame` (variantes
  `standard`, `imperial` et une par branche ; ornements `full`, `corners`, `none`), `ui-banner-header`,
  `ui-section-divider`, `ui-branch-badge` (Joueurs, Développeurs, Communicants, Ciné & séries),
  `ui-framed-avatar`, `ui-member-card` (plusieurs branches, présence), `ui-event-card` (statut calculé),
  `ui-feed-post` (annonce, épinglage, date relative), `ui-stat-block` (tendance accessible).
- `ui-loader` : 9 loaders prédéfinis en CSS (`spinner`, `ring`, `dots`, `pulse`, `bars`, `orbit`, `grid`, `line`,
  `skeleton`), annoncés aux lecteurs d'écran, adoucis si les animations sont réduites ; taille, couleur, vitesse,
  délai d'apparition. Choix **global** (`provideUiLoader()` dans la configuration de l'application), **par zone**
  (`providers` d'un composant), **local** (`type`), modifiable à l'exécution (`UiLoaderDefaults.set()`) ; loaders
  personnalisés enregistrés par nom (`loaders`). Le bouton `loading` (nouvelle entrée `loader`) et le lecteur
  multimédia utilisent ce loader.
- `ui-image` : emplacement réservé (`ratio`, `width` / `height`), téléchargement à l'approche de la fenêtre
  (`preloadMargin`) ou immédiat (`priority`), loader puis fondu après décodage, `srcset` / `sizes`, aperçu flou
  (`placeholderSrc`), image de secours, message et bouton Réessayer, calque `[uiImageOverlay]`, `src` à `null` en
  attente. Service `UiImagePreloader` pour précharger les images à venir.
- `ui-table` : export des données affichées, activable avec `exportable` (bouton « Exporter ») : CSV (séparateur `;`,
  UTF-8 avec BOM pour Excel, injection de formules neutralisée), Excel `.xlsx` (généré sans dépendance : en-tête figé,
  filtre automatique, nombres et dates typés) et JSON. Respecte recherche, filtres, tri, colonnes visibles et leur
  ordre ; avec la pagination, toutes les lignes ou la page affichée. `exportFormats`, `exportFilename`,
  `exportOptions`, événement annulable `exportRequest` (export côté serveur), méthodes `exportData()` /
  `exportTable()`, colonnes `exportable: false` et `exportValue`. Fonctions `tableToCsv()`, `tableToXlsx()`,
  `tableToJson()`.
- `uiChatHttpTransport()` : transport `HttpClient` (`POST { messages }`, flux NDJSON) ; un transport peut aussi
  renvoyer un `Observable`, un `AsyncIterable` ou une `Promise`. `renderChatMarkdown()` / `chatMarkdownToText()`.

### Documentation

- Onglet « Côté serveur » du chat : Angular, Symfony et Node.js avec le SDK officiel d'Anthropic (clé côté serveur,
  limite de débit, validation de l'historique, annulation à la déconnexion).
- Le menu de la documentation charge un index léger : bundle initial ramené de 758 à 575 ko.

## [0.1.1] — 2026-11-23

Aucun changement de code : mise à jour de la page npm.

### Documentation

- Site de documentation officiel : <https://angular.uikit.imperiumclan.fr/> (lien « Homepage » de la page npm et
  README du paquet).
- README : consultation hors ligne avec l'image Docker `iemperor/ic-angular-uikit-docs`.

## [0.1.0] — 2026-11-23

Première version publiée.

### Ajouté

- **Mise en page** : `ui-layout` + `ui-sidebar` (colonnes gauche / droite, rail d'icônes, redimensionnement, tiroir
  mobile), `ui-app-bar` (navigation repliable), `ui-jumbotron`.
- **Actions** : `uiButton` (primary, secondary, outline, ghost, success, warning, danger ; icônes ; boutons bascule),
  `ui-toolbar` (motif ARIA toolbar).
- **Formulaires** : `ui-text-field`, `ui-textarea`, `ui-select`, `ui-checkbox`, `ui-radio-group`, `ui-switch`,
  `ui-file-upload`, avec validation graphique et messages personnalisables (`provideUiValidation`).
- **Navigation** : `ui-menu` + `ui-submenu` (vertical / horizontal, multi-niveaux), `ui-tabs` (horizontaux / verticaux).
- **Affichage** : `ui-badge`, `ui-card` (horizontale), `ui-carousel`, `ui-dashboard` (widgets déplaçables,
  redimensionnables, à deux faces, catalogue par catégories), `ui-icon` (Font Awesome, Material, Bootstrap Icons,
  Lucide, SVG), `ui-org-chart`, `ui-ribbon`, `ui-table` (tri, recherche, filtres, colonnes, pagination),
  `ui-season-effects`.
- **Retours & superpositions** : `ui-alert`, `ui-dialog`.
- **Thèmes** : `light`, `dark`, `season-light`, `season-dark`, jetons CSS `--ui-*`, `ThemeService`.
