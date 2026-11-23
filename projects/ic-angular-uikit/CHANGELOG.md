# Journal des versions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation [SemVer](https://semver.org/lang/fr/)
(en 0.x, une version mineure peut contenir des changements incompatibles).

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
