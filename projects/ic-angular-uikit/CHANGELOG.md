# Journal des versions

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) ; numérotation [SemVer](https://semver.org/lang/fr/)
(en 0.x, une version mineure peut contenir des changements incompatibles).

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
