import { normalize } from './nav';

export interface TextPart {
  text: string;
  match: boolean;
}

/**
 * Découpe `text` en segments, en marquant ceux qui correspondent aux mots de `query`
 * (comparaison insensible à la casse et aux accents, rendu sans innerHTML).
 */
export function highlightParts(text: string, query: string): TextPart[] {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [{ text, match: false }];
  }
  // Texte normalisé caractère par caractère, avec la position d'origine de chaque caractère.
  let flat = '';
  const origin: number[] = [];
  [...text].forEach((ch, i) => {
    for (const n of normalize(ch)) {
      flat += n;
      origin.push(i);
    }
  });
  const marked = new Array<boolean>([...text].length).fill(false);
  for (const word of words) {
    let from = flat.indexOf(word);
    while (from !== -1) {
      for (let k = from; k < from + word.length; k++) marked[origin[k]] = true;
      from = flat.indexOf(word, from + word.length);
    }
  }
  const chars = [...text];
  const parts: TextPart[] = [];
  chars.forEach((ch, i) => {
    const last = parts[parts.length - 1];
    if (last && last.match === marked[i]) last.text += ch;
    else parts.push({ text: ch, match: marked[i] });
  });
  return parts;
}
