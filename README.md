# IC Angular UiKit

[![npm](https://img.shields.io/npm/v/ic-angular-uikit)](https://www.npmjs.com/package/ic-angular-uikit)
[![licence MIT](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

Bibliothèque de composants **Angular 22** accessibles et thémables (standalone, signaux, `OnPush`), publiée sur npm
sous le nom [`ic-angular-uikit`](https://www.npmjs.com/package/ic-angular-uikit), et son site de documentation généré à
partir du code.

```sh
npm install ic-angular-uikit
```

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

Ajouter un composant = créer `projects/ic-angular-uikit/src/lib/<nom>/<nom>.ts`, l'exporter dans `public-api.ts` : la
page `/components/<nom>` apparaît.

Règles du projet : composants standalone `OnPush` à base de signaux, préfixe `ui`, aucun `innerHTML` ni
`bypassSecurityTrust*`, WCAG 2.1 AA (contrastes vérifiés dans tous les thèmes, clavier, axe-core sans violation),
styles qui ne fuient pas dans les instances imbriquées du même composant (combinateurs enfants).

## Site de documentation en Docker

Image statique (nginx non root, port 8080, CSP stricte, `HEALTHCHECK` sur `/healthz`), publiée sur Docker Hub :
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
