import { Component } from '@angular/core';

/** Loader aux couleurs de la marque : un composant ordinaire, qui lit la taille et la couleur dans les variables CSS. */
@Component({
  selector: 'doc-brand-loader',
  template: `
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path class="shield" d="M24 4 40 10v12c0 11-7 19-16 22C15 41 8 33 8 22V10z" />
      <text x="24" y="29" text-anchor="middle">IC</text>
    </svg>
  `,
  styles: `
    :host { display: block; width: var(--ui-loader-size); height: var(--ui-loader-size); color: var(--ui-loader-color, var(--ui-color-primary)); }
    svg { width: 100%; height: 100%; overflow: visible; }
    .shield { fill: none; stroke: currentColor; stroke-width: 3; stroke-dasharray: 120; animation: draw calc(1.6s * var(--ui-loader-duration-scale, 1)) ease-in-out infinite; }
    text { fill: currentColor; font: 700 14px system-ui, sans-serif; }
    @keyframes draw { 0% { stroke-dashoffset: 120; } 60%, 100% { stroke-dashoffset: 0; } }
    @media (prefers-reduced-motion: reduce) { .shield { animation: none; } }
  `,
})
export class BrandLoader {}
