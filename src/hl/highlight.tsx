import React, { ReactNode } from 'react';
import lexJs from './js';
import lexScheme from './scheme';

export default function highlight(source: string, lang?: string): ReactNode[] {
  const lexer = lang ? lexers[lang] : undefined;

  if (!lexer) {
    return [source];
  }

  const tokens = lexer(source);
  return tokens.map(({ type, text }, i) => {
    const htmlText = type === 'ws' ? convertWs(text) : text;
    return (
      <span className={type} key={i}>
        {htmlText}
      </span>
    );
  });
}

const lexers = {
  javascript: lexJs,
  scheme: lexScheme,
};

export interface Token {
  type: string;
  text: string;
}

function convertWs(text: string): string {
  return text
    .split('')
    .map(c => {
      if (c === ' ') {
        return '&nbsp';
      } else if (c === '\t') {
        return '&nbsp;&nbsp';
      } else {
        return c;
      }
    })
    .join('');
}
