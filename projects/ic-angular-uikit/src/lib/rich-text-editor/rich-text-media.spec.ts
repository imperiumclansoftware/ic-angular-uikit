import { createRichTextFigure, parseRichText, safeRichTextMediaUrl, sanitizeRichText, serializeRichText } from './rich-text-html';

const media = { media: true };

describe('rich-text-html : médias (option media)', () => {
  it('désactivés par défaut : images et vidéos retirées', () => {
    expect(sanitizeRichText('<p>Avant <img src="/a.png" alt="A"> après</p><video src="/v.mp4"></video>')).toBe('<p>Avant  après</p>');
  });

  it('image et vidéo normalisées en figure, paragraphe coupé autour', () => {
    expect(sanitizeRichText('<p>Avant <img src="/a.png" alt="Un chat" width="640" height="480"> après</p>', document, media)).toBe(
      '<p>Avant </p><figure><img src="/a.png" alt="Un chat" width="640" height="480"></figure><p> après</p>',
    );
    expect(sanitizeRichText('<figure><img src="https://cdn.exemple.fr/b.jpg" alt=""><figcaption>Une <b>légende</b></figcaption></figure>', document, media)).toBe(
      '<figure><img src="https://cdn.exemple.fr/b.jpg" alt=""><figcaption>Une <strong>légende</strong></figcaption></figure>',
    );
    expect(sanitizeRichText('<video controls autoplay muted poster="/p.jpg" title="Bande-annonce"><source src="/v.webm" type="video/webm"></video>', document, media)).toBe(
      '<figure><video src="/v.webm" poster="/p.jpg" title="Bande-annonce" controls preload="metadata"></video></figure>',
    );
  });

  it('adresses et attributs dangereux refusés', () => {
    const dirty =
      '<img src="javascript:alert(1)" alt="x"><img src="data:image/png;base64,AAAA" alt="y">' +
      '<img src="/ok.png" alt="ok" onerror="alert(2)" style="width:9999px" class="c" width="99999" height="abc">' +
      '<video src="/v.mp4" onplay="x()" poster="javascript:alert(3)"></video><img src="mailto:a@b.fr" alt="m">';
    expect(sanitizeRichText(dirty, document, media)).toBe('<figure><img src="/ok.png" alt="ok"></figure><figure><video src="/v.mp4" controls preload="metadata"></video></figure>');
    expect(safeRichTextMediaUrl('JaVa\tScript:alert(1)')).toBeNull();
    expect(safeRichTextMediaUrl('//autre.site/x.png')).toBe('//autre.site/x.png');
  });

  it('filtre d’adresses (seulement le domaine du site)', () => {
    const policy = { media: { allowUrl: (url: string) => url.startsWith('/') && !url.startsWith('//') } };
    expect(sanitizeRichText('<img src="/a.png" alt="a"><img src="https://pistage.example/p.gif" alt="p"><img src="//cdn.example/x.png" alt="x">', document, policy)).toBe(
      '<figure><img src="/a.png" alt="a"></figure>',
    );
  });

  it('médias hors des blocs (listes, liens) retirés ; citation avec seulement une figure gardée', () => {
    expect(sanitizeRichText('<ul><li>un <img src="/a.png" alt="a"></li></ul>', document, media)).toBe('<ul><li>un </li></ul>');
    expect(sanitizeRichText('<blockquote><img src="/a.png" alt="a"></blockquote>', document, media)).toBe('<blockquote><figure><img src="/a.png" alt="a"></figure></blockquote>');
  });

  it('createRichTextFigure et sérialisation du DOM de l’éditeur (bouton et attributs d’édition ignorés)', () => {
    const figure = createRichTextFigure(document, { kind: 'image', src: '/a.png', alt: '  Lac  ', caption: 'Au matin', width: 800, height: 600 });
    expect(figure?.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    expect(createRichTextFigure(document, { kind: 'image', src: 'javascript:x', alt: '' })).toBeNull();
    const root = document.createElement('div');
    root.append(parseRichText('<p>Texte</p>', document, media), figure as HTMLElement);
    figure?.setAttribute('contenteditable', 'false');
    const button = document.createElement('button');
    button.textContent = '×';
    figure?.append(button);
    expect(serializeRichText(root, document, media)).toBe('<p>Texte</p><figure><img src="/a.png" alt="Lac" width="800" height="600"><figcaption>Au matin</figcaption></figure>');
    // Sans l'option, la même valeur perd la figure (contenu rejeté côté lecture aussi).
    expect(serializeRichText(root, document)).toBe('<p>Texte</p><p>Au matin</p>');
  });
});
