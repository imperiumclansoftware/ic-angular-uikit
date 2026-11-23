import { FormControl } from '@angular/forms';
import { parseRichText, richTextLength, richTextMaxLength, richTextToPlainText, safeRichTextUrl, sanitizeRichText, serializeRichText } from './rich-text-html';

describe('rich-text-html', () => {
  it('garde la liste blanche et normalise les alias', () => {
    expect(sanitizeRichText('<h2>Titre</h2><p>Un <b>gras</b>, <i>italique</i>, <u>souligné</u>, <strike>barré</strike> et <code>code</code>.</p>')).toBe(
      '<h2>Titre</h2><p>Un <strong>gras</strong>, <em>italique</em>, <u>souligné</u>, <s>barré</s> et <code>code</code>.</p>',
    );
    expect(sanitizeRichText('<h1>A</h1><h5>B</h5>')).toBe('<h2>A</h2><h4>B</h4>');
    expect(sanitizeRichText('<ul><li>un<li>deux</ul><ol><li>trois</li></ol>')).toBe('<ul><li>un</li><li>deux</li></ul><ol><li>trois</li></ol>');
    expect(sanitizeRichText('<blockquote>cité</blockquote><hr><pre>a\n  b<br>c</pre>')).toBe('<blockquote><p>cité</p></blockquote><hr><pre>a\n  b\nc</pre>');
  });

  it('retire scripts, styles, images, attributs et liens dangereux', () => {
    const dirty =
      '<p onclick="x()" style="color:red" class="c">Bonjour <script>alert(1)</script><img src=x onerror=alert(2)>' +
      '<a href="javascript:alert(3)">piège</a> <a href=" JaVa\tScRiPt:alert(4)">piège2</a> <a href="data:text/html,x">data</a>' +
      ' <a href="https://ok.fr" onmouseover="y()" target="_top">ok</a></p><style>p{}</style><iframe src="//x"></iframe>' +
      '<svg><script>alert(5)</script></svg><template><p>caché</p></template><!-- commentaire -->';
    expect(sanitizeRichText(dirty)).toBe('<p>Bonjour piège piège2 data <a href="https://ok.fr">ok</a></p>');
  });

  it('adresses de lien autorisées', () => {
    expect(safeRichTextUrl('https://a.fr/x?y#z')).toBe('https://a.fr/x?y#z');
    expect(safeRichTextUrl('mailto:a@b.fr')).toBe('mailto:a@b.fr');
    expect(safeRichTextUrl('/aide')).toBe('/aide');
    expect(safeRichTextUrl('#ancre')).toBe('#ancre');
    expect(safeRichTextUrl('page?a=b:c')).toBe('page?a=b:c');
    expect(safeRichTextUrl('javascript:alert(1)')).toBeNull();
    expect(safeRichTextUrl('java\nscript:alert(1)')).toBeNull();
    expect(safeRichTextUrl('vbscript:x')).toBeNull();
    expect(safeRichTextUrl('')).toBeNull();
  });

  it('entités, texte sans bloc, conteneurs', () => {
    expect(sanitizeRichText('A &amp; B &lt;b&gt; &eacute;t&#233; &#x1F600; &nbsp;fin')).toBe('<p>A &amp; B &lt;b&gt; été 😀 &nbsp;fin</p>');
    expect(sanitizeRichText('<div>ligne 1</div><div>ligne 2</div>')).toBe('<p>ligne 1</p><p>ligne 2</p>');
    expect(sanitizeRichText('<table><tr><td>a</td><td>b</td></tr></table>')).toBe('<p>a</p><p>b</p>');
    expect(sanitizeRichText('<p>a<p>b')).toBe('<p>a</p><p>b</p>');
    expect(sanitizeRichText('<strong><p>bloc dans en ligne</p></strong>')).toBe('<p><strong>bloc dans en ligne</strong></p>');
    expect(sanitizeRichText('<p>non fermé <a href="/x" title="a>b">lien')).toBe('<p>non fermé <a href="/x">lien</a></p>');
    expect(sanitizeRichText('<p> </p><p><br></p>')).toBe('');
    expect(sanitizeRichText(null)).toBe('');
  });

  it('construit des nœuds DOM, jamais du HTML interprété', () => {
    const fragment = parseRichText('<p>x<img src=x onerror=alert(1)></p>');
    expect(fragment.querySelector('img')).toBeNull();
    expect(fragment.firstChild?.nodeName).toBe('P');
    const root = document.createElement('div');
    root.append(parseRichText('<p>a <b>b</b></p>'), document.createElement('span'));
    expect(serializeRichText(root)).toBe('<p>a <strong>b</strong></p>');
  });

  it('texte brut, longueur et validateur', () => {
    const html = '<h2>Titre</h2><p>Un <strong>mot</strong></p><ul><li>a</li><li>b</li></ul>';
    expect(richTextToPlainText(html)).toBe('Titre\nUn mot\na\nb');
    expect(richTextLength(html)).toBe(13);
    expect(richTextMaxLength(13)(new FormControl(html))).toBeNull();
    expect(richTextMaxLength(10)(new FormControl(html))).toEqual({ maxlength: { requiredLength: 10, actualLength: 13 } });
  });
});
