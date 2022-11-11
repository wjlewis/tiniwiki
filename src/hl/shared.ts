export function span(text: string, className?: string): Token {
  return { type: TokenType.span, text, class: className };
}

export function ws(length: number): Token {
  return { type: TokenType.ws, length };
}

export function line(): Token {
  return { type: TokenType.line };
}

export type Token = SpanToken | WsToken | LineToken;

export enum TokenType {
  span = 'SPAN',
  ws = 'WS',
  line = 'LINE',
}

export interface SpanToken extends BaseToken {
  type: TokenType.span;
  text: string;
  class?: string;
}

export interface WsToken extends BaseToken {
  type: TokenType.ws;
  length: number;
}

export interface LineToken extends BaseToken {
  type: TokenType.line;
}

interface BaseToken {
  type: TokenType;
}
