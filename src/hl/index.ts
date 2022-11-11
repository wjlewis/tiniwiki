import { Node, elt, text } from '../html';
import { Token, TokenType } from './shared';
import { fallback } from './fallback';

export function highlightCode(code: string, lang?: string): Node {
  const hl = lang ? highlighters[lang] ?? fallback : fallback;
  const lines = hl(code);

  return elt(
    'code',
    null,
    lines.map(line =>
      elt(
        'pre',
        { class: 'code-line' },
        line.map(token => {
          if (token.type === TokenType.span) {
            return elt('span', { class: token.class }, [text(token.text)]);
          } else if (token.type === TokenType.ws) {
            return text(' '.repeat(token.length));
          } else {
            throw new Error('unreachable');
          }
        })
      )
    )
  );
}

const highlighters: { [lang: string]: Highlighter } = {};

export type Highlighter = (text: string) => Array<Token[]>;
