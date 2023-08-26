import { Token } from './highlight';

export default function lex(source: string): Token[] {
  return [...emitTokens(source)];
}

function* emitTokens(source: string): Generator<Token> {
  let pos = 0;

  function skipWhile(pred: (char: string) => boolean) {
    while (pos < source.length && pred(source[pos])) {
      pos++;
    }
  }

  function token(type: string, start: number, end: number): Token {
    return { type, text: source.slice(start, end) };
  }

  while (pos < source.length) {
    let startPos = pos;
    const c = source[pos++];

    if (punctChars.includes(c)) {
      yield { type: 'punct', text: c };
    } else if (opChars.includes(c)) {
      yield { type: 'op', text: c };
    } else if (c === '/') {
      // Are we looking at a division operator, a regular expression, or
      // comment?
      if (source[pos] === '/') {
        pos = locateInlineCommentEnd(source, pos + 1);
        yield token('comment', startPos, pos);
      } else if (source[pos] === '*') {
        pos = locateBlockCommentEnd(source, pos + 1);
        yield token('comment', startPos, pos);
      } else {
        const endIdx = locateRegExpEnd(source, pos);

        if (endIdx === -1) {
          yield { type: 'op', text: c };
        } else {
          pos = endIdx;
          yield token('regex', startPos, pos);
        }
      }
    } else if (' \t'.includes(c)) {
      skipWhile(c => ' \t'.includes(c));
      yield token('space', startPos, pos);
    } else if ('\n\r'.includes(c)) {
      skipWhile(c => '\n\r'.includes(c));
      yield token('line', startPos, pos);
    } else if (startsName(c)) {
      skipWhile(continuesName);
      const text = source.slice(startPos, pos);
      const type = keywords.includes(text) ? 'keyword' : 'name';
      yield { type, text };
    } else if (isDigit(c)) {
      skipWhile(isDigit);
      yield token('number', startPos, pos);
    } else if ('\'"'.includes(c)) {
      pos = locateStringEnd(source, pos, c);
      yield token('string', startPos, pos);
    } else if (c === '`') {
      let escapeNext = false;

      while (pos < source.length) {
        const c = source[pos];

        if (escapeNext) {
          escapeNext = false;
        } else if (c === '\\') {
          escapeNext = true;
        } else if (c === '`') {
          pos++;
          yield token('string', startPos, pos);
          break;
        } else if (c === '$' && source[pos + 1] === '{') {
          // Yield the string segment up to this point.
          yield token('string', startPos, pos);

          // Yield and advance past the `${` operator.
          yield { type: 'op', text: '${' };
          pos += 2;

          // Yield the JS inside.
          const endIdx = locateInterpolationEnd(source, pos);
          const interpolatedSource = source.slice(pos, endIdx);
          yield* emitTokens(interpolatedSource);

          // Yield and advance past the `}` operator.
          yield { type: 'op', text: '}' };
          pos = endIdx + 1;

          // Advance `startPos` so that we're ready for the next string segment.
          startPos = pos;

          continue;
        }

        pos++;
      }
    } else {
      yield { type: 'unknown', text: c };
    }
  }
}

const punctChars = '()[]{};,';

const opChars = '+-*^=?:<>.&|!';

const keywords = [
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'of',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'let',
  'static',
  'yield',
  'await',
];

function locateInlineCommentEnd(source: string, from: number): number {
  while (from < source.length) {
    if ('\n\r'.includes(source[from])) {
      return from;
    }

    from++;
  }

  return source.length;
}

function locateBlockCommentEnd(source: string, from: number): number {
  while (from < source.length) {
    if (source[from] === '*' && source[from + 1] === '/') {
      return from + 2;
    } else {
      from++;
    }
  }

  return source.length;
}

function locateRegExpEnd(source: string, from: number): number {
  let escapeNext = false;
  while (from < source.length) {
    const c = source[from];

    if (escapeNext) {
      escapeNext = false;
    } else if (c === '\\') {
      escapeNext = true;
    } else if (c === '/') {
      return from + 1;
    } else if ('\n\r'.includes(c)) {
      return -1;
    }

    from++;
  }

  return -1;
}

function startsName(c: string): boolean {
  return ('a' <= c && c <= 'z') || ('A' <= c && c <= 'Z') || c === '_';
}

function continuesName(c: string): boolean {
  return startsName(c) || isDigit(c) || c === '*';
}

function isDigit(c: string): boolean {
  return '0' <= c && c <= '9';
}

function locateStringEnd(source: string, from: number, closer: string): number {
  let escapeNext = false;

  while (from < source.length) {
    const c = source[from];

    if (escapeNext) {
      escapeNext = false;
    } else if (c === '\\') {
      escapeNext = true;
    } else if ('\n\r'.includes(c)) {
      return from;
    } else if (c === closer) {
      return from + 1;
    }

    from++;
  }

  return source.length;
}

function locateInterpolationEnd(source: string, from: number): number {
  let openCount = 1;

  while (from < source.length) {
    const c = source[from];

    if (c === '/') {
      if (source[from + 1] === '/') {
        from = locateInlineCommentEnd(source, from + 2);
      } else if (source[from + 1] === '*') {
        from = locateBlockCommentEnd(source, from + 2);
      } else {
        const endIdx = locateRegExpEnd(source, from + 1);
        if (endIdx !== -1) {
          from = endIdx;
        } else {
          from++;
        }
      }
    } else if ('\'"'.includes(c)) {
      from = locateStringEnd(source, from + 1, c);
    } else if (c === '`') {
      from = locateTemplateStringEnd(source, from + 1);
    } else if (c === '}') {
      openCount--;

      if (openCount === 0) {
        return from;
      }

      from++;
    } else if (c === '$' && source[from + 1] === '{') {
      from += 2;
      openCount++;
    } else {
      from++;
    }
  }

  return source.length;
}

function locateTemplateStringEnd(source: string, from: number): number {
  let escapeNext = false;

  while (from < source.length) {
    const c = source[from];

    if (escapeNext) {
      escapeNext = false;
    } else if (c === '\\') {
      escapeNext = true;
    } else if (c === '`') {
      return from + 1;
    } else if (c === '$' && source[from + 1] === '{') {
      from = locateInterpolationEnd(source, from + 2);
      continue;
    }

    from++;
  }

  return source.length;
}
