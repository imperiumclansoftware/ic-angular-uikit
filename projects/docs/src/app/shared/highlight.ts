/**
 * Coloration syntaxique minimale (TypeScript, HTML, CSS, shell) qui produit des jetons
 * rendus par le template — aucun innerHTML, compatible CSP stricte + Trusted Types.
 */
export type TokenKind = 'plain' | 'comment' | 'string' | 'keyword' | 'number' | 'tag' | 'attr' | 'punct' | 'fn' | 'type' | 'prop';

export interface CodeToken {
  text: string;
  kind: TokenKind;
}

export type CodeLanguage = 'ts' | 'html' | 'css' | 'sh' | 'php' | 'py' | 'text';

const TS_KEYWORDS = new Set(
  'abstract as async await break case catch class const constructor continue default delete do else enum export extends false finally for from function get if implements import in instanceof interface let new null of private protected public readonly return set static super switch this throw true try type typeof undefined var void while yield'.split(
    ' ',
  ),
);

interface Rule {
  kind: TokenKind | ((match: string) => TokenKind);
  re: RegExp;
}

const TS_RULES: Rule[] = [
  { kind: 'comment', re: /\/\*[\s\S]*?\*\/|\/\/[^\n]*/y },
  { kind: 'string', re: /'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/y },
  { kind: 'type', re: /@[A-Za-z]+/y },
  { kind: 'number', re: /\b\d[\d_.]*\b/y },
  { kind: (w) => (TS_KEYWORDS.has(w) ? 'keyword' : /^[A-Z]/.test(w) ? 'type' : 'plain'), re: /[A-Za-z_$][\w$]*/y },
  { kind: 'punct', re: /[{}()[\];,.<>:=+\-*/!?&|]+/y },
];

const HTML_RULES: Rule[] = [
  { kind: 'comment', re: /<!--[\s\S]*?-->/y },
  { kind: 'tag', re: /<\/?[A-Za-z][\w-]*|\/?>/y },
  { kind: 'string', re: /"[^"]*"|'[^']*'/y },
  { kind: 'keyword', re: /@(?:if|else if|else|for|empty|switch|case|default|defer|let)\b/y },
  { kind: 'attr', re: /[[(#*]{0,2}[A-Za-z][\w.\-:]*[\])]{0,2}(?==)/y },
  { kind: 'attr', re: /[[(#*][\w.\-:]+[\])]*/y },
  { kind: 'punct', re: /\{\{|\}\}/y },
];

const CSS_RULES: Rule[] = [
  { kind: 'comment', re: /\/\*[\s\S]*?\*\//y },
  { kind: 'string', re: /'[^']*'|"[^"]*"/y },
  { kind: 'prop', re: /--[\w-]+|[a-z-]+(?=\s*:)/y },
  { kind: 'number', re: /#[\da-fA-F]{3,8}\b|\b\d[\d.]*(?:px|rem|em|ms|s|%|vh|vw)?/y },
  { kind: 'fn', re: /[a-z-]+(?=\()/y },
  { kind: 'keyword', re: /@[a-z-]+/y },
];

const PHP_KEYWORDS = new Set(
  'abstract and array as break case catch class const continue declare default do echo else elseif empty enum exit extends false final finally fn for foreach function global if implements include instanceof interface isset list match namespace new null or private protected public readonly require return self static switch throw trait true try unset use var while yield never void int string bool float mixed'.split(
    ' ',
  ),
);

const PHP_RULES: Rule[] = [
  { kind: 'comment', re: /\/\*[\s\S]*?\*\/|\/\/[^\n]*|#(?!\[)[^\n]*/y },
  { kind: 'type', re: /#\[[^\]\n]*\]?/y },
  { kind: 'string', re: /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/y },
  { kind: 'keyword', re: /<\?php/y },
  { kind: 'attr', re: /\$[A-Za-z_]\w*/y },
  { kind: 'number', re: /\b\d[\d_.]*\b/y },
  { kind: (w) => (PHP_KEYWORDS.has(w.toLowerCase()) ? 'keyword' : /^[A-Z]/.test(w) ? 'type' : 'plain'), re: /[A-Za-z_\\][\w\\]*/y },
  { kind: 'punct', re: /[{}()[\];,.<>:=+\-*/!?&|@]+/y },
];

const PY_KEYWORDS = new Set(
  'and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield'.split(' '),
);

const PY_RULES: Rule[] = [
  { kind: 'comment', re: /#[^\n]*/y },
  { kind: 'string', re: /[rbfu]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/y },
  { kind: 'type', re: /@[A-Za-z_][\w.]*/y },
  { kind: 'number', re: /\b\d[\d_.]*\b/y },
  { kind: (w) => (PY_KEYWORDS.has(w) ? 'keyword' : /^[A-Z]/.test(w) ? 'type' : 'plain'), re: /[A-Za-z_]\w*/y },
  { kind: 'punct', re: /[{}()[\];,.<>:=+\-*/!?&|%]+/y },
];

const SH_RULES: Rule[] = [
  { kind: 'comment', re: /#[^\n]*/y },
  { kind: 'string', re: /'[^']*'|"[^"]*"/y },
  { kind: 'keyword', re: /\b(?:npm|npx|ng|node|git|cd)\b/y },
  { kind: 'attr', re: /(?<=^|\s)--?[\w-]+/y }, // option (précédée d'un espace), pas un tiret dans un mot
];

function tokenize(code: string, rules: Rule[], embedHtmlInTemplates = false): CodeToken[] {
  const tokens: CodeToken[] = [];
  let plain = '';
  let pos = 0;
  const flush = () => {
    if (plain) {
      tokens.push({ text: plain, kind: 'plain' });
      plain = '';
    }
  };
  outer: while (pos < code.length) {
    if (embedHtmlInTemplates && code[pos] === '`') {
      const end = findTemplateEnd(code, pos + 1);
      flush();
      tokens.push({ text: '`', kind: 'string' });
      const inner = code.slice(pos + 1, end);
      tokens.push(...(looksLikeHtml(inner) ? tokenize(inner, HTML_RULES) : [{ text: inner, kind: 'string' as const }]));
      if (end < code.length) tokens.push({ text: '`', kind: 'string' });
      pos = end + 1;
      continue;
    }
    for (const rule of rules) {
      rule.re.lastIndex = pos;
      const match = rule.re.exec(code);
      if (match && match[0].length > 0) {
        const kind = typeof rule.kind === 'function' ? rule.kind(match[0]) : rule.kind;
        if (kind === 'plain') {
          plain += match[0];
        } else {
          flush();
          tokens.push({ text: match[0], kind });
        }
        pos += match[0].length;
        continue outer;
      }
    }
    plain += code[pos];
    pos += 1;
  }
  flush();
  return tokens;
}

function findTemplateEnd(code: string, from: number): number {
  for (let i = from; i < code.length; i++) {
    if (code[i] === '\\') i++;
    else if (code[i] === '`') return i;
  }
  return code.length;
}

const looksLikeHtml = (text: string) => /<[A-Za-z][\w-]*[\s>/]/.test(text);

export function highlight(code: string, language: CodeLanguage): CodeToken[] {
  switch (language) {
    case 'ts':
      return tokenize(code, TS_RULES, true);
    case 'html':
      return tokenize(code, HTML_RULES);
    case 'css':
      return tokenize(code, CSS_RULES);
    case 'sh':
      return tokenize(code, SH_RULES);
    case 'php':
      return tokenize(code, PHP_RULES);
    case 'py':
      return tokenize(code, PY_RULES);
    default:
      return [{ text: code, kind: 'plain' }];
  }
}
