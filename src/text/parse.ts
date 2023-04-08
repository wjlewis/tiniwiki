export default function parse(source: string): Note {
  const lines = source.split(/\n|\r\n/g);
  return { blocks: linesToBlocks(lines) };
}

export interface Note {
  blocks: Block[];
}

function linesToBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let wip = [];

  function commitWip() {
    const text = wip.join('\n').trim();
    if (text.length > 0) {
      const entities = textToEntities(text);
      blocks.push({ type: BlockType.para, entities });
    }
    wip = [];
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const j = firstNontrivialIndex(line);

    if (j < 0) {
      // Empty line.
      commitWip();
      i++;
      continue;
    } else if (line[j] === '#') {
      // Heading.
      commitWip();
      let order = 1;
      while (order < 6 && line[j + order] === '#') {
        order++;
      }
      const text = line.substring(j + order).trim();
      const entities = textToEntities(text);
      blocks.push({ type: BlockType.heading, order, entities });
      i++;
      continue;
    } else if (line.substring(j).startsWith('```')) {
      const endIndex = findIndexFrom(i + 1, lines, line =>
        line.substring(j).startsWith('```')
      );

      if (endIndex >= 0) {
        // Pre.
        commitWip();
        const text = lines
          .slice(i + 1, endIndex)
          .map(line => line.substring(j))
          .join('\n');
        const meta = line.substring(j + 3).trim();
        blocks.push({
          type: BlockType.pre,
          text: unescapeBackticks(text),
          meta,
        });
        i = endIndex + 1;
        continue;
      }
    } else if (line[j] === '>') {
      // Blockquote.
      commitWip();
      const endIndex = indentedBlockEndIndex(lines, i + 1, j, '>');
      const quoteLines = lines
        .slice(i, endIndex)
        .map(line => line.substring(j + 1));
      const children = linesToBlocks(quoteLines);
      blocks.push({ type: BlockType.quote, children });
      i = endIndex;
      continue;
    } else if (/^(-|\d+\.)/.test(line.substring(j))) {
      // List.
      commitWip();
      const unordered = line.substring(j).startsWith('-');
      const items = [];

      const pat = unordered ? /^(-)/ : /^(\d+\.)/;
      let k = i;
      while (k < lines.length) {
        const line = lines[k].substring(j);
        if (!pat.test(line)) {
          break;
        }
        const endIndex = indentedBlockEndIndex(lines, k + 1, j);
        const itemLines = [
          line.replace(pat, '').trimStart(),
          ...lines.slice(k + 1, endIndex).map(line => line.substring(j + 1)),
        ];
        const children = linesToBlocks(itemLines);
        items.push({ children });
        k = endIndex;
        i = k;
      }

      blocks.push({ type: BlockType.list, ordered: !unordered, items });
      continue;
    }

    wip.push(line);
    i++;
  }

  commitWip();

  return blocks;
}

function firstNontrivialIndex(line: string): number {
  for (let i = 0; i < line.length; i++) {
    if (/\S/.test(line[i])) {
      return i;
    }
  }

  return -1;
}

function indentedBlockEndIndex(
  lines: string[],
  start: number,
  indent: number,
  permit?: string
): number {
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    const j = firstNontrivialIndex(line);

    if (
      (j >= 0 && j < indent) ||
      (j === indent && (!permit || line[j] !== permit))
    ) {
      return i;
    }
  }

  return lines.length;
}

function findIndexFrom(start, xs, fn) {
  const index = xs.slice(start).findIndex(fn);
  return index < 0 ? index : start + index;
}

export type Block =
  | ParaBlock
  | HeadingBlock
  | PreBlock
  | QuoteBlock
  | ListBlock;

export enum BlockType {
  para = 'para',
  heading = 'heading',
  pre = 'pre',
  quote = 'quote',
  list = 'list',
}

export interface ParaBlock extends BaseBlock {
  type: BlockType.para;
  entities: Entity[];
}

export interface HeadingBlock extends BaseBlock {
  type: BlockType.heading;
  order: number;
  entities: Entity[];
}

export interface PreBlock extends BaseBlock {
  type: BlockType.pre;
  text: string;
  meta?: string;
}

export interface QuoteBlock extends BaseBlock {
  type: BlockType.quote;
  children: Block[];
}

export interface ListBlock extends BaseBlock {
  type: BlockType.list;
  ordered: boolean;
  items: Block[];
}

interface BaseBlock {
  type: BlockType;
}

function textToEntities(source: string): Entity[] {
  const entities: Entity[] = [];
  let wipIndex = 0;
  let i = 0;

  function commitWip() {
    const text = source.substring(wipIndex, i);
    if (text.length > 0) {
      entities.push({ type: EntityType.plain, text: unescapeAll(text) });
    }
    wipIndex = i;
  }

  function advanceTo(j: number) {
    i = j;
    wipIndex = i;
  }

  let escapeNext = false;
  while (i < source.length) {
    if (escapeNext) {
      escapeNext = false;
      i++;
      continue;
    }

    const c = source[i];

    if (c === '\\') {
      escapeNext = true;
      i++;
      continue;
    } else if ('_*`"'.includes(c)) {
      const endIndex = nextOccurrenceOf(c, source, i + 1);
      if (endIndex >= 0) {
        // Styled or quoted text.
        commitWip();
        const text = source.slice(i + 1, endIndex);
        if (c === '`') {
          entities.push({
            type: EntityType.mono,
            text: unescapeBackticks(text),
          });
        } else {
          const children = textToEntities(text);
          const type = {
            _: EntityType.emph,
            '*': EntityType.strong,
            '"': EntityType.quote,
          }[c];
          entities.push({ type, children } as Entity);
        }

        advanceTo(endIndex + 1);
        continue;
      }
    } else if (c === '[') {
      const rBracketIndex = nextOccurrenceOf(']', source, i + 1);
      if (rBracketIndex >= 0 && source[rBracketIndex + 1] === '(') {
        const rParenIndex = nextOccurrenceOf(')', source, rBracketIndex + 2);
        if (rParenIndex >= 0) {
          // Link.
          commitWip();
          const text = source.substring(i + 1, rBracketIndex);
          const children = textToEntities(text);
          const href = source.substring(rBracketIndex + 2, rParenIndex);
          entities.push({ type: EntityType.link, href, children });
          advanceTo(rParenIndex + 1);
          continue;
        }
      }
    }

    i++;
  }

  commitWip();

  return entities;
}

function nextOccurrenceOf(
  marker: string,
  source: string,
  start: number
): number {
  let escapeNext = false;
  let inMono = false;

  for (let i = start; i < source.length; i++) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    const c = source[i];
    if (c === '\\') {
      escapeNext = true;
    } else if (c === marker && !inMono) {
      return i;
    } else if (c === '`') {
      inMono = !inMono;
    }
  }

  return -1;
}

export type Entity =
  | PlainEntity
  | EmphEntity
  | StrongEntity
  | QuoteEntity
  | MonoEntity
  | LinkEntity;

export enum EntityType {
  plain = 'plain',
  emph = 'emph',
  strong = 'strong',
  quote = 'quote',
  mono = 'mono',
  link = 'link',
}

export interface PlainEntity extends BaseEntity {
  type: EntityType.plain;
  text: string;
}

export interface EmphEntity extends BaseEntity {
  type: EntityType.emph;
  children: Entity[];
}

export interface StrongEntity extends BaseEntity {
  type: EntityType.strong;
  children: Entity[];
}

export interface QuoteEntity extends BaseEntity {
  type: EntityType.quote;
  children: Entity[];
}

export interface MonoEntity extends BaseEntity {
  type: EntityType.mono;
  text: string;
}

export interface LinkEntity extends BaseEntity {
  type: EntityType.link;
  href: string;
  children: Entity[];
}

interface BaseEntity {
  type: EntityType;
}

function unescapeAll(text: string): string {
  return text.replace(/\\(.)/g, (_, c) => c);
}

function unescapeBackticks(text: string): string {
  return text.replace(/\\`/g, '`');
}
