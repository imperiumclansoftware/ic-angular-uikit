import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from 'ic-angular-uikit';
import { ApiEntry, ApiMember } from './doc-types';
import { Markdown } from './markdown';

interface InputRow extends ApiMember {
  twoWay: boolean;
}

/** Tables d'API d'un composant, d'une directive, d'un service ou d'une fonction. */
@Component({
  selector: 'doc-api',
  imports: [UiBadge, Markdown, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './api-view.html',
  styleUrl: './api-view.css',
})
export class ApiView {
  readonly entry = input.required<ApiEntry>();

  protected readonly kindLabel = computed(
    () => ({ component: 'Composant', directive: 'Directive', service: 'Service', function: 'Fonction' })[this.entry().kind],
  );

  protected readonly inputs = computed<InputRow[]>(() => [
    ...this.entry().models.map((m) => ({ ...m, twoWay: true })),
    ...this.entry().inputs.map((i) => ({ ...i, twoWay: false })),
  ]);

  protected readonly outputs = computed<ApiMember[]>(() => [
    ...this.entry().models.map((m) => ({
      name: `${m.name}Change`,
      type: m.type,
      description: `Émis quand \`${m.name}\` change (liaison \`[(${m.name})]\`).`,
    })),
    ...this.entry().outputs,
  ]);

  protected readonly selectors = computed(() => (this.entry().selector ?? '').split(',').map((s) => s.trim()).filter(Boolean));
}
