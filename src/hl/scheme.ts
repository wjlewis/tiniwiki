import { Token } from './highlight';

export default function lex(source: string): Token[] {
  let pos = 0;
  const tokens: Token[] = [];

  function skipWhile(pred: (char: string) => boolean) {
    while (pos < source.length && pred(source[pos])) {
      pos++;
    }
  }

  while (pos < source.length) {
    const startPos = pos;
    const c = source[pos++];

    let type: string;
    if (punctChars.includes(c)) {
      type = 'punct';
    } else if (opChars.includes(c)) {
      type = 'op';
    } else if (c === ';') {
      skipWhile(c => !'\n\r'.includes(c));
      type = 'comment';
    } else if (' \t'.includes(c)) {
      skipWhile(c => ' \t'.includes(c));
      type = 'space';
    } else if ('\n\r'.includes(c)) {
      skipWhile(c => '\n\r'.includes(c));
      type = 'line';
    } else if (startsName(c)) {
      skipWhile(continuesName);
      type = 'name';
    } else if (isDigit(c)) {
      skipWhile(isDigit);
      type = 'number';
    } else if (c === '#' && 'tf'.includes(source[pos])) {
      pos++;
      type = 'boolean';
    } else if (c === "'") {
      let escapeNext = false;
      while (pos < source.length) {
        const c = source[pos];

        if (escapeNext) {
          escapeNext = false;
        } else if (c === '\\') {
          escapeNext = true;
        } else if ('"\n\r'.includes(c)) {
          break;
        }

        pos++;
      }

      type = 'string';
    } else {
      type = 'unknown';
    }

    const text = source.slice(startPos, pos);
    tokens.push({
      type: keywords.includes(text) ? 'keyword' : type,
      text,
    });
  }

  return tokens;
}

const punctChars = '()[]';

const opChars = "'`.,@";

const keywords = ['begin', 'define', 'if', 'lambda', 'let', 'quote', 'set!'];

function startsName(c: string): boolean {
  return (
    ('a' <= c && c <= 'z') ||
    ('A' <= c && c <= 'Z') ||
    '+-*/!$%^&_=:<>?'.includes(c)
  );
}

function continuesName(c: string): boolean {
  return startsName(c) || isDigit(c);
}

function isDigit(c: string): boolean {
  return '0' <= c && c <= '9';
}
