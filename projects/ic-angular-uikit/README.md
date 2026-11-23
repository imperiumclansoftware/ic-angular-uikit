# IC Angular UiKit

[![npm](https://img.shields.io/npm/v/ic-angular-uikit)](https://www.npmjs.com/package/ic-angular-uikit)
[![licence MIT](https://img.shields.io/npm/l/ic-angular-uikit)](https://github.com/imperiumclansoftware/ic-angular-uikit/blob/main/LICENSE)

Bibliothèque de composants **Angular 22** accessibles et thémables : composants standalone à base de signaux,
`OnPush`, templatisables (slots et `ng-template`), thèmes **clair**, **sombre** et **saisonniers**, compatible avec une
CSP stricte et Trusted Types.

**Documentation : <https://angular.uikit.imperiumclan.fr/>** — exemples interactifs, API de chaque composant, guides.

- Plus de 25 composants : formulaires avec validation, tableaux (recherche, filtres, pagination), menus multi-niveaux, barre
  d'application, carrousel, tableau de bord personnalisable, organigramme…
- Accessibilité visée : **WCAG 2.1 AA** (contrastes vérifiés dans tous les thèmes, clavier complet, motifs ARIA).
- Thèmes par jetons CSS (`--ui-color-*`), applicables à toute la page ou à une seule zone.
- Icônes au choix : Font Awesome, Material Symbols, Bootstrap Icons, Lucide, SVG maison.
- Aucun `innerHTML`, aucune dépendance d'exécution hors Angular, RxJS et `tslib`.

## Prérequis

| Paquet | Version |
| --- | --- |
| `@angular/core`, `@angular/common`, `@angular/forms` | `^22.2.0` |
| `rxjs` | `~7.8.0` |

## Installation

```sh
npm install ic-angular-uikit
```

### 1. Styles

Ajoutez la feuille de styles globale (jetons + thèmes) dans `angular.json`, avant vos propres styles :

```json
"styles": [
  "node_modules/ic-angular-uikit/styles/ic-angular-uikit.css",
  "src/styles.css"
]
```

### 2. Configuration

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideUiKit } from 'ic-angular-uikit';

export const appConfig: ApplicationConfig = {
  providers: [
    provideUiKit({ defaultTheme: 'system' }), // 'light' | 'dark' | 'system' | 'season-light' | 'season-dark' | 'imperium-dark'
  ],
};
```

### 3. Utilisation

Chaque composant est standalone : importez-le là où vous l'utilisez.

```ts
import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButton, UiCard, UiTextField } from 'ic-angular-uikit';

@Component({
  selector: 'app-newsletter',
  imports: [ReactiveFormsModule, UiCard, UiTextField, UiButton],
  template: `
    <ui-card>
      <ui-text-field label="E-mail" type="email" [formControl]="email" hint="Une lettre par mois." />
      <button uiButton icon="lucide:mail" [disabled]="email.invalid" (click)="sent.set(true)">S'inscrire</button>
    </ui-card>
  `,
})
export class Newsletter {
  protected readonly email = new FormControl('', [Validators.required, Validators.email]);
  protected readonly sent = signal(false);
}
```

## Composants

| Catégorie | Composants |
| --- | --- |
| Mise en page | `ui-layout` + `ui-sidebar` (colonnes, rail, tiroir mobile), `ui-app-bar`, `ui-jumbotron` |
| Actions | `uiButton` (7 variantes, icônes, chargement), `ui-toolbar`, `ui-context-menu` (clic droit, appui long, clavier) |
| Formulaires | `ui-text-field`, `ui-textarea`, `ui-select`, `ui-checkbox`, `ui-radio-group`, `ui-switch`, `ui-file-upload`, `ui-rich-text-editor` (WYSIWYG) |
| Navigation | `ui-menu` + `ui-submenu` (vertical / horizontal, multi-niveaux), `ui-tabs` (horizontaux / verticaux) |
| Affichage | `ui-chat` (conversation avec une IA), `ui-image` (préchargement et loader), `ui-media-player` (musique, vidéos, YouTube / Vimeo) + `ui-mini-player`, `ui-rich-text` (HTML riche nettoyé), `ui-badge`, `ui-card`, `ui-carousel`, `ui-dashboard`, `ui-icon`, `ui-org-chart`, `ui-ribbon`, `ui-table` (recherche, filtres, pagination, export CSV / Excel / JSON), `ui-season-effects` |
| Retours & superpositions | `ui-alert`, `ui-dialog`, `ui-loader` (loaders choisis globalement ou localement) |
| Imperium | `ui-arabesque-frame`, `ui-banner-header`, `ui-section-divider`, `ui-branch-badge`, `ui-member-card`, `ui-event-card`, `ui-feed-post`, `ui-stat-block`, `ui-ornament`, `ui-framed-avatar` |

Chaque composant documente ses inputs, outputs, slots, variables CSS et exemples dans le
[site de documentation](https://angular.uikit.imperiumclan.fr/).

## Thèmes

Thèmes fournis : `light`, `dark`, `imperium-dark` (Imperium Clan, voir plus bas), `season-light`, `season-dark` (couleurs selon la saison, animations facultatives avec
`<ui-season-effects />`). Le thème est porté par l'attribut `data-ui-theme` : sur `<html>` via `ThemeService`, ou sur
n'importe quel élément pour une seule zone.

```ts
import { ThemeService } from 'ic-angular-uikit';

inject(ThemeService).setTheme('dark'); // préférence mémorisée (désactivable : provideUiKit({ storageKey: null }))
```

Personnalisez les jetons (`--ui-color-primary`, `--ui-radius-md`…) dans vos styles, ou créez un thème en copiant
`styles/themes/dark.css` puis en le déclarant : `provideUiKit({ themes: ['light', 'dark', 'mon-theme'] })`.
Pour cibler tous les thèmes sombres : `[data-ui-theme$='dark']`.

## Icônes

Aucune librairie d'icônes n'est imposée. Installez celle de votre choix et déclarez-la :

```ts
import { provideUiIcons, fontAwesomeFont, lucideIcons } from 'ic-angular-uikit';
import { Mail, Search } from 'lucide';

provideUiIcons([fontAwesomeFont(), lucideIcons({ Mail, Search })], { defaultSet: 'lucide' });
```

```html
<ui-icon name="lucide:search" />
<button uiButton icon="fas:floppy-disk">Enregistrer</button>
```

Adaptateurs : `fontAwesomeFont`, `fontAwesomeSvg`, `materialSymbols`, `materialIcons`, `bootstrapIcons`, `lucideIcons`,
`svgIcons`, `fontIcons`. Installez les polices depuis npm plutôt qu'un CDN (compatible CSP `font-src 'self'`).

## Formulaires et validation

Les champs fonctionnent avec `[(value)]`, `formControl`, `formControlName` ou `ngModel`, et affichent eux-mêmes
erreurs, vérification asynchrone et succès. Messages personnalisables par champ (`[errorMessages]`), par validateur
(`{ clé: { message } }`) ou pour toute l'application :

```ts
provideUiValidation({ showErrorsWhen: 'touched', messages: { required: 'Ce champ est obligatoire.' } });
```

## Texte riche

`ui-rich-text-editor` est un champ de formulaire dont la valeur est du **HTML nettoyé** par une liste blanche (titres,
listes, liens, gras…) ; `ui-rich-text` l'affiche sans `innerHTML`. Le nettoyage est fait par un analyseur maison qui
construit les nœuds DOM un par un : compatible CSP stricte et Trusted Types.

```html
<ui-rich-text-editor label="Article" [formControl]="content" [maxLength]="5000" />
<ui-rich-text [html]="article.content" externalLinks="_blank" />
```

Le serveur doit **renettoyer** le HTML reçu avant de l'enregistrer : la documentation fournit des exemples Symfony
(HtmlSanitizer) et Node.js (sanitize-html) avec la même liste blanche.

## Thème Imperium Clan

`imperium-dark` habille toute la librairie dans le style néo-héroïque du clan (or antique, arabesques, obsidienne) et
ajoute des composants dédiés : `ui-arabesque-frame`, `ui-banner-header`, `ui-section-divider`, `ui-branch-badge`,
`ui-member-card`, `ui-event-card`, `ui-feed-post`, `ui-stat-block`, `ui-ornament`.

```ts
provideUiKit({ defaultTheme: 'imperium-dark' })   // ou data-ui-theme="imperium-dark" sur une zone
```

Le thème attend quatre polices libres (OFL), à héberger avec l'application (pas d'appel à Google Fonts, compatible
CSP stricte) :

```sh
npm install @fontsource-variable/cinzel @fontsource-variable/inter @fontsource/unifrakturcook @fontsource/jetbrains-mono
```

```json
"styles": [
  "node_modules/ic-angular-uikit/styles/ic-angular-uikit.css",
  "node_modules/@fontsource-variable/inter/index.css",
  "node_modules/@fontsource-variable/cinzel/index.css",
  "node_modules/@fontsource/unifrakturcook/700.css",
  "node_modules/@fontsource/jetbrains-mono/400.css"
]
```

## Loaders et images

Les indicateurs de chargement se choisissent pour toute l'application, pour une zone, ou localement :

```ts
// app.config.ts
providers: [provideUiLoader({ type: 'dots', delay: 150 })]
```

```html
<ui-loader />                     <!-- loader de l'application -->
<ui-loader type="bars" size="lg" />
<button uiButton loading>Envoyer</button>
<ui-image src="/photos/lac.jpg" alt="Lac de montagne" ratio="16/9" />
```

Prédéfinis : `spinner`, `ring`, `dots`, `pulse`, `bars`, `orbit`, `grid`, `line`, `skeleton` ; un composant
Angular peut être enregistré comme loader (`provideUiLoader({ loaders: { marque: BrandLoader } })`).
`ui-image` réserve sa place, télécharge l'image à l'approche de la fenêtre, affiche le loader puis l'image en fondu ;
`UiImagePreloader` précharge les images à venir.

## Export des tables

`exportable` ajoute un bouton « Exporter » à `ui-table` : CSV, Excel (`.xlsx`) ou JSON, avec exactement ce qui est
affiché (recherche, filtres, tri, colonnes visibles et leur ordre ; toutes les lignes ou la page affichée).

```html
<ui-table [data]="orders" [columns]="columns" exportable exportFilename="commandes" paginated searchable />
```

Une colonne d'actions se déclare `exportable: false` ; `exportValue` donne la valeur exportée d'une cellule rendue par
un template. Le classeur Excel est généré sans dépendance. Dans le CSV, les textes commençant par `=`, `+`, `-` ou `@`
sont neutralisés (injection de formules). Pour un export côté serveur, appelez `preventDefault()` sur `(exportRequest)`.

## Conversation avec une IA

`ui-chat` affiche une conversation avec un assistant : réponse en flux rendue en Markdown (sans `innerHTML`),
Arrêter, régénérer, copier, avis. Il appelle **votre** API, jamais le fournisseur d'IA directement : la clé reste sur
le serveur.

```ts
protected readonly transport = uiChatHttpTransport(inject(HttpClient), '/api/chat');
protected readonly messages = signal<UiChatMessage[]>([]);
```

```html
<ui-chat [transport]="transport" [(messages)]="messages" welcome="Bonjour ! Posez votre question." />
```

L'API reçoit `{ messages: [{ role, content }] }` et répond en flux NDJSON (`{"text":"…"}` par morceau). La
documentation fournit des serveurs Symfony et Node.js complets (SDK officiel d'Anthropic, limite de débit, validation).

## Musique et vidéos

`ui-media-player` lit des fichiers audio / vidéo (commandes accessibles, sous-titres WebVTT, visualisations
prédéfinies pour la musique) et des vidéos YouTube / Vimeo, chargées seulement au clic (cookies de l'hébergeur).
`ui-mini-player`, placé par exemple dans une `ui-app-bar`, suit le lecteur actif de la page.

```html
<ui-media-player [sources]="tracks" visualization="bars" />
<ui-mini-player />
```

Pour YouTube et Vimeo, autorisez leurs lecteurs dans la CSP : `frame-src https://www.youtube-nocookie.com
https://player.vimeo.com` (aucun script tiers n'est chargé dans votre page).

## Tableau de bord

`ui-dashboard` affiche des widgets déplaçables et redimensionnables (souris, tactile, clavier), à deux faces, avec une
colonne de personnalisation et un catalogue par catégories. Un widget est un composant Angular ordinaire :

```ts
@Component({
  imports: [UiWidgetFront, UiWidgetSettings, UiTextField],
  template: `
    <ng-template uiWidgetFront>{{ ctx.config().message }}</ng-template>
    <ng-template uiWidgetSettings>
      <ui-text-field label="Message" [value]="ctx.config().message" (valueChange)="ctx.updateConfig({ message: $event })" />
    </ng-template>
  `,
})
export class MessageWidget {
  protected readonly ctx = injectUiWidgetContext<{ message: string }>();
}
```

La disposition (`layoutChange`) est un JSON sérialisable à enregistrer côté serveur ; relisez-la avec
`sanitizeDashboardLayout()`. La documentation fournit des exemples serveur (Symfony, Node.js, PHP).

## Accessibilité

- Contrastes de texte ≥ 4,5:1 et contours de contrôles ≥ 3:1 dans chaque thème ; l'information n'est jamais portée
  par la couleur seule.
- Navigation clavier complète, focus visible, motifs ARIA (onglets, menus, barre d'outils, carrousel…).
- Animations désactivées avec `prefers-reduced-motion`.
- En développement, avertissements dans la console pour les champs sans libellé et les images sans `alt`.

## Sécurité

- Aucun `innerHTML` ni `bypassSecurityTrust*` : les SVG sont construits avec `Renderer2` et une liste blanche.
- Compatible avec une CSP stricte (`script-src 'self'`, `require-trusted-types-for 'script'`).
- `localStorage` utilisé uniquement pour la préférence de thème (désactivable).
- Les contrôles côté client (taille de fichier, disposition du tableau de bord…) sont un confort : revalidez toujours
  côté serveur.

## Documentation

Site officiel : **<https://angular.uikit.imperiumclan.fr/>** — exemples interactifs, API de chaque composant (inputs,
outputs, slots, variables CSS), guides thèmes, validation et accessibilité, exemples côté serveur.

Pour le consulter hors ligne : `docker run -d -p 8080:8080 iemperor/ic-angular-uikit-docs`, ou depuis les sources :

```sh
git clone https://github.com/imperiumclansoftware/ic-angular-uikit.git
cd ic-angular-uikit && npm install && npm start   # http://localhost:4220
```

Code source : <https://github.com/imperiumclansoftware/ic-angular-uikit> — questions et anomalies :
<https://github.com/imperiumclansoftware/ic-angular-uikit/issues>

## Licence

[MIT](https://github.com/imperiumclansoftware/ic-angular-uikit/blob/main/LICENSE) © Imperium Clan Software
