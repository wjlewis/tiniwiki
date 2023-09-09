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
    if (opChars.includes(c)) {
      type = 'op';
    } else if (punctChars.includes(c)) {
      type = 'punct';
    } else if (c === '/' && source[pos] === '/') {
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

const punctChars = '(){},;=';

const opChars = '.=>';

const keywords = ['let', 'mod', 'root', 'self', 'super', 'use'];

function startsName(c: string): boolean {
  return ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') || c === '_';
}

function continuesName(c: string): boolean {
  return startsName(c) || isDigit(c);
}

function isDigit(c: string): boolean {
  return '0' <= c && c <= '9';
}
