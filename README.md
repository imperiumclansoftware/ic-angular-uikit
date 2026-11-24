# IC Angular UiKit

[![npm](https://img.shields.io/npm/v/ic-angular-uikit)](https://www.npmjs.com/package/ic-angular-uikit)
[![licence MIT](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

Bibliothèque de composants **Angular 22** accessibles et thémables (standalone, signaux, `OnPush`), publiée sur npm
sous le nom [`ic-angular-uikit`](https://www.npmjs.com/package/ic-angular-uikit), et son site de documentation généré à
partir du code.

```sh
npm install ic-angular-uikit
```

**Documentation officielle : <https://angular.uikit.imperiumclan.fr/>**

**Installation, configuration et utilisation : voir le [README du paquet](projects/ic-angular-uikit/README.md)**
(c'est aussi la page npm). Ce fichier-ci décrit le dépôt et le développement de la librairie.

## Structure

| Chemin | Contenu |
| --- | --- |
| `projects/ic-angular-uikit/src/lib/<composant>/` | Un dossier par composant (+ ses directives et sa logique pure), avec ses tests `*.spec.ts` |
| `projects/ic-angular-uikit/src/styles/` | `tokens.css` (jetons communs), `themes/*.css`, `seasons.css`, point d'entrée `ic-angular-uikit.css` |
| `projects/docs/` | Site de documentation (Angular) |
| `projects/docs/src/app/examples/<composant>/*.example.ts` | Exemples affichés sur le site (découverts automatiquement) |
| `projects/docs/src/backend-examples/<composant>/` | Onglet « Côté serveur » (Angular, Symfony, Node.js, PHP…) |
| `tools/generate-docs.mjs` | Extrait l'API (inputs, outputs, models, méthodes, slots, variables CSS, types) avec le compilateur TypeScript |
| `deploy/nginx.conf`, `deploy/security-headers.conf` | Configuration nginx du site statique (CSP stricte + Trusted Types, cache) |
| `Dockerfile`, `DOCKERHUB.md`, `.github/workflows/docker.yml` | Image Docker de la documentation et sa publication |

## Commandes

```sh
npm install          # dépendances (Node.js 22 ou plus)
npm start            # site de doc sur http://localhost:4220 (régénère l'API à chaque modification)
npm test             # tests unitaires de la librairie (Vitest)
npm run lint         # ESLint (règles de sécurité incluses)
npm run build        # dist/ic-angular-uikit (paquet npm) + dist/docs (site statique)
```

`npm run start:proxy` sert le site derrière un proxy sous `/proxy/4220/` (build en continu + serveur statique avec la
CSP de production).

## Documenter un composant

La documentation est tirée du code — il n'y a rien à maintenir à la main :

- **Description** : JSDoc de la classe (Markdown simple : paragraphes, listes `- `, `code`, **gras**, blocs de code).
  **Propriétés / événements / méthodes** : JSDoc des `input()`, `model()`, `output()` et méthodes publiques ; types et
  valeurs par défaut sont lus par le compilateur.
- **Slots** : `@slot [uiCardHeader] - Description` ; **variables CSS** : `@cssprop --ui-x - Description` (sur la classe).
- **Catégorie du menu** : `@category Formulaires` sur la classe du composant principal (ordre des catégories dans
  `projects/docs/src/app/shared/nav.ts`).
- **Masquer** un membre : `@internal`.
- **Exemple** : `projects/docs/src/app/examples/<dossier>/<nom>.example.ts` ; la 1re ligne de la JSDoc est le titre,
  la suite la description, `@order N` fixe l'ordre. La classe affichée est celle dont le nom finit par `Example`.
  Les fichiers locaux qu'il importe (`./donnees`, données, composants annexes) sont ajoutés automatiquement à « Voir
  le code », un onglet par fichier : mettez les données d'exemple dans un fichier à part plutôt que dans `shared/`.

Ajouter un composant = créer `projects/ic-angular-uikit/src/lib/<nom>/<nom>.ts`, l'exporter dans `public-api.ts` : la
page `/components/<nom>` apparaît.

Règles du projet : composants standalone `OnPush` à base de signaux, préfixe `ui`, aucun `innerHTML` ni
`bypassSecurityTrust*`, WCAG 2.1 AA (contrastes vérifiés dans tous les thèmes, clavier, axe-core sans violation),
styles qui ne fuient pas dans les instances imbriquées du même composant (combinateurs enfants).

## Menu contextuel et éditeur de texte riche

- `ui-context-menu` + `[uiContextMenuTrigger]` : clic droit, appui long (tactile), touche Menu / Maj+F10 ;
  motif ARIA « menu » (réutilise `uiMenuItem`, `ui-submenu`, `ui-menu-group`, `ui-menu-separator`, avec
  `checked`, `checkMode`, `shortcut`, `tone="danger"`). Popover natif positionné au pointeur.
- `ui-rich-text-editor` (champ de formulaire, valeur = HTML nettoyé) et `ui-rich-text` (affichage) : analyse à liste
  blanche maison (`rich-text-html.ts`, sans `innerHTML` / `DOMParser`, compatible Trusted Types), listes et historique
  gérés par le composant, `execCommand` limité aux marques et aux blocs. Le serveur doit renettoyer : onglet
  « Côté serveur » (Symfony HtmlSanitizer, Node sanitize-html, validés par un banc de 31 tests).

## Fichiers, galerie, médias de l'éditeur

- `UiFileSource` (`lib/file-manager/file-source.ts`) : contrat commun (lister obligatoire, le reste facultatif ;
  actions masquées si absentes), `uiHttpFileSource` (REST) et `uiMemoryFileSource` (démos, tests).
- `ui-file-manager` : listbox multisélection (tabindex itinérant, grille 2D), dialogues `ui-dialog` pour le nom et
  la suppression, `ui-context-menu`, envois `Observable` annulables ; zone étroite → vignettes réduites (requête de
  conteneur).
- `ui-media-gallery` : `<dialog>` natif plein écran, `ui-image` (préchargement), `ui-media-player` pour les vidéos.
- Médias de l'éditeur : option `media` de `rich-text-html.ts` (figure normalisée, attributs connus, adresses
  filtrées) ; figures non éditables dans la zone de saisie, bouton × ajouté au rendu et ignoré à la sérialisation.
- Exemples serveur `backend-examples/file-manager` (Symfony, Node) validés par `test-files.sh` (44 contrôles) ;
  variantes « médias » des nettoyeurs de `backend-examples/rich-text-editor` (8 contrôles chacune).

## Conversation avec une IA

- `ui-chat` : fil en `role="log"` sans annonce de chaque morceau du flux ; la réponse complète passe par une zone
  `aria-live` dédiée. Rendu Markdown maison (`chat-markdown.ts`, `createElement` uniquement, liens filtrés par
  `safeRichTextUrl`, images jamais chargées), au plus une fois par image d'animation pendant le flux.
- Transport : `Observable`, `AsyncIterable` ou `Promise` ; `uiChatHttpTransport` lit le NDJSON avec `HttpClient`
  (`reportProgress` + `partialText`). Arrêter désabonne / déclenche l'`AbortSignal`.
- Exemples serveur (`backend-examples/chat`) : Symfony et Node.js avec le SDK d'Anthropic (`claude-opus-5-5`, effort
  explicite, repli côté serveur `fallbacks: "default"`), validés par un banc de 40 tests contre un faux service SSE
  local (aucun appel facturé).
- La documentation charge un index léger pour le menu (`generated/nav-index.ts`) ; l'API complète
  (`generated/api.ts`) n'est importée que par les pages chargées à la demande (`shared/api-groups.ts`).

## Lecteur multimédia

- `ui-media-player` : un seul `<video>` natif pour l'audio et la vidéo (graphe Web Audio unique pour les
  visualisations, créé seulement si toutes les sources sont de même origine ou en CORS, sinon le son serait coupé) ;
  YouTube / Vimeo : iframe créée par `Renderer2` à partir de l'identifiant validé (pas de `bypassSecurityTrust`),
  chargée après consentement, pilotée par `postMessage` (origine et fenêtre vérifiées).
- `UiMediaHub` : lecteur actif de la page (suivi par `ui-mini-player`), lecture exclusive.
- Médias de démonstration servis par le site (`projects/docs/public/demo/media`, morceaux synthétisés) ; CSP de la
  doc : `frame-src` limité aux deux lecteurs ; nginx sert `.vtt` en `text/vtt`.

## Site de documentation en Docker

Image statique (nginx non root, port 8080, CSP stricte, `HEALTHCHECK` sur `/healthz`) — celle qui sert
<https://angular.uikit.imperiumclan.fr/> —, publiée sur Docker Hub :
[`iemperor/ic-angular-uikit-docs`](https://hub.docker.com/r/iemperor/ic-angular-uikit-docs) (voir `DOCKERHUB.md`).

```sh
docker build -t ic-angular-uikit-docs .                      # --build-arg BASE_HREF=/docs/ pour un sous-chemin
docker run -d -p 8080:8080 --read-only --tmpfs /tmp ic-angular-uikit-docs
```

Le workflow `.github/workflows/docker.yml` construit l'image (amd64 + arm64), la teste puis la publie à chaque tag
`vX.Y.Z` (ou à la demande depuis l'onglet Actions). Il a besoin de la variable `DOCKERHUB_USERNAME` et du secret
`DOCKERHUB_TOKEN` dans les réglages du dépôt GitHub.

## Publier une version

1. Mettre à jour `version` dans `projects/ic-angular-uikit/package.json` et `CHANGELOG.md`.
2. Vérifier : `npm run lint && npm test && npm run build`.
3. Contrôler le contenu du paquet : `cd dist/ic-angular-uikit && npm pack --dry-run`.
4. Publier depuis `dist/ic-angular-uikit` : `npm publish` (compte npm avec 2FA), puis créer et pousser le tag
   `vX.Y.Z` : l'image Docker de la documentation est alors publiée automatiquement.

`npm run build:lib` recopie `LICENSE` et `CHANGELOG.md` dans le paquet.

## Licence

[MIT](LICENSE) © Imperium Clan Software
