import { Token, span } from './shared';

export function fallback(text: string): Array<Token[]> {
  return text.split('\n').map(line => (line.length > 0 ? [span(line)] : []));
}
