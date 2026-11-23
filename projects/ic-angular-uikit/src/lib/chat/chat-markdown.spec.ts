import { chatMarkdownToText, renderChatMarkdown } from './chat-markdown';

function html(markdown: string, options = {}): string {
  const div = document.createElement('div');
  div.appendChild(renderChatMarkdown(markdown, document, options));
  // Lecture seule, pour comparer la sérialisation dans le test (aucune écriture de HTML).
  // eslint-disable-next-line no-restricted-syntax
  return div.innerHTML;
}

describe('renderChatMarkdown', () => {
  it('rend le HTML du texte comme du texte (aucune balise interprétée)', () => {
    const out = html('Bonjour <img src=x onerror="alert(1)"> <script>alert(2)</script> <b>gras</b>');
    expect(out).toBe('<p>Bonjour &lt;img src=x onerror="alert(1)"&gt; &lt;script&gt;alert(2)&lt;/script&gt; &lt;b&gt;gras&lt;/b&gt;</p>');
  });

  it('filtre les liens et n’affiche jamais les images', () => {
    const out = html('[piège](javascript:alert(1)) [ok](https://a.fr) [local](/aide) ![logo](https://pistage.fr/p.png) https://nu.fr/x.');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('pistage');
    expect(out).toContain('<a href="https://a.fr" target="_blank" rel="noopener noreferrer nofollow ugc">ok</a>');
    expect(out).toContain('<a href="/aide">local</a>');
    expect(out).toContain('logo');
    expect(out).toContain('<a href="https://nu.fr/x" target="_blank" rel="noopener noreferrer nofollow ugc">https://nu.fr/x</a>.');
  });

  it('mise en forme en ligne, titres décalés, citations et séparateurs', () => {
    expect(html('**gras** *ital* _ital2_ ~~barré~~ `a<b`')).toBe('<p><strong>gras</strong> <em>ital</em> <em>ital2</em> <s>barré</s> <code>a&lt;b</code></p>');
    expect(html('# Titre\n## Sous-titre', { headingOffset: 3 })).toBe('<h3>Titre</h3><h4>Sous-titre</h4>');
    expect(html('###### Six', { headingOffset: 4 })).toBe('<h6>Six</h6>');
    expect(html('> cité\n\n---')).toBe('<blockquote><p>cité</p></blockquote><hr>');
    expect(html('ligne 1\nligne 2')).toBe('<p>ligne 1<br>ligne 2</p>');
  });

  it('listes imbriquées et numérotées', () => {
    expect(html('- un\n  - un.a\n- deux\n\n3. trois\n4. quatre')).toBe(
      '<ul><li>un<ul><li>un.a</li></ul></li><li>deux</li></ul><ol start="3"><li>trois</li><li>quatre</li></ol>',
    );
  });

  it('blocs de code : bouton Copier, langue, et bloc non terminé pendant le flux', () => {
    const div = document.createElement('div');
    div.appendChild(renderChatMarkdown('```ts\nconst a = 1 < 2;\n```', document));
    const button = div.querySelector('button.ui-chat-md__copy') as HTMLButtonElement;
    expect(button.getAttribute('type')).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Copier le code ts');
    expect(div.querySelector('pre')?.getAttribute('tabindex')).toBe('0');
    expect(div.querySelector('code')?.textContent).toBe('const a = 1 < 2;');
    expect(div.querySelector('code')?.getAttribute('data-language')).toBe('ts');
    expect(html('```\nen cours', { copyButtons: false })).not.toContain('<button');
    expect(html('```\nen cours')).toContain('en cours');
  });

  it('tableaux dans une région défilante accessible', () => {
    const div = document.createElement('div');
    div.appendChild(renderChatMarkdown('| Nom | Âge |\n|---|---:|\n| Ada | 36 |\n| a \\| b | 2 |', document));
    const region = div.querySelector('.ui-chat-md__table') as HTMLElement;
    expect(region.getAttribute('role')).toBe('region');
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-label')).toBe('Tableau : Nom, Âge');
    expect([...div.querySelectorAll('th')].map((th) => [th.textContent, th.getAttribute('scope')])).toEqual([
      ['Nom', 'col'],
      ['Âge', 'col'],
    ]);
    expect([...div.querySelectorAll('td')].map((td) => td.textContent)).toEqual(['Ada', '36', 'a | b', '2']);
  });

  it('chatMarkdownToText donne le texte lisible', () => {
    expect(chatMarkdownToText('# Titre\n**gras** et [lien](https://a.fr)\n\n- un\n- deux')).toContain('gras et lien');
    expect(chatMarkdownToText('<b>x</b>')).toBe('<b>x</b>');
  });
});

describe('renderChatMarkdown : liens dans les liens', () => {
  it('pas de lien imbriqué ni de récursion', () => {
    expect(html('[https://a.fr](https://a.fr)')).toBe('<p><a href="https://a.fr" target="_blank" rel="noopener noreferrer nofollow ugc">https://a.fr</a></p>');
    const div = document.createElement('div');
    div.appendChild(renderChatMarkdown('[voir [b](https://b.fr)](https://a.fr) [x](https://c.fr/https://d.fr)', document));
    expect(div.querySelector('a a')).toBeNull();
    // Parenthèses équilibrées dans l'adresse (Wikipédia) ; lien refusé rendu en texte, sans parenthèse orpheline.
    expect(html('[Ada](https://fr.wikipedia.org/wiki/Ada_(langage)) et [x](javascript:alert(1)).')).toBe(
      '<p><a href="https://fr.wikipedia.org/wiki/Ada_(langage)" target="_blank" rel="noopener noreferrer nofollow ugc">Ada</a> et x.</p>',
    );
    expect(html('[**gras** https://x.fr](https://a.fr)')).toBe(
      '<p><a href="https://a.fr" target="_blank" rel="noopener noreferrer nofollow ugc"><strong>gras</strong> https://x.fr</a></p>',
    );
  });
});
