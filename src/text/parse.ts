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
          text: unescapeInBlockMono(text),
          meta,
        });
        i = endIndex + 1;
        continue;
      }
    } else if (line.substring(j).startsWith('$$')) {
      const endIndex = findIndexFrom(i + 1, lines, line =>
        line.substring(j).startsWith('$$')
      );

      if (endIndex >= 0) {
        // Math.
        commitWip();
        const text = lines
          .slice(i + 1, endIndex)
          .map(line => line.substring(j))
          .join('\n');
        blocks.push({
          type: BlockType.math,
          text,
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
    } else if (/^(- |\d+\.)/.test(line.substring(j))) {
      // List.
      commitWip();
      const unordered = line.substring(j).startsWith('- ');
      const items: Array<Block[]> = [];

      const pat = unordered ? /^(- )/ : /^(\d+\.)/;
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
        items.push(children);
        k = endIndex;
        i = k;
      }

      blocks.push({ type: BlockType.list, ordered: !unordered, items });
      continue;
    } else if (/^\[\^\w+\]:/.test(line.substring(j))) {
      // Footnote
      const endIndex = indentedBlockEndIndex(lines, i + 1, j);
      const re = /^\[\^(?<key>\w+)\]:/;
      const match = re.exec(line.substring(j));
      const key = match.groups.key;
      const lineText = line.substring(j + match[0].length);
      const noteLines = [lineText, ...lines.slice(i + 1, endIndex)];
      const children = linesToBlocks(noteLines);
      blocks.push({ type: BlockType.footnote, key, children });
      i = endIndex;
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
  | MathBlock
  | QuoteBlock
  | ListBlock
  | FootnoteBlock;

export enum BlockType {
  para = 'para',
  heading = 'heading',
  pre = 'pre',
  math = 'math',
  quote = 'quote',
  list = 'list',
  footnote = 'footnote',
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

export interface MathBlock extends BaseBlock {
  type: BlockType.math;
  text: string;
}

export interface QuoteBlock extends BaseBlock {
  type: BlockType.quote;
  children: Block[];
}

export interface ListBlock extends BaseBlock {
  type: BlockType.list;
  ordered: boolean;
  items: Array<Block[]>;
}

export interface FootnoteBlock extends BaseBlock {
  type: BlockType.footnote;
  key: string;
  children: Block[];
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
    } else if ('_*"`$'.includes(c)) {
      const endIndex = nextOccurrenceOf(c, source, i + 1);
      if (endIndex >= 0) {
        // Styled or quoted text.
        commitWip();
        const text = source.slice(i + 1, endIndex);
        if (c === '`') {
          entities.push({
            type: EntityType.mono,
            text: unescapeInMono(text),
          });
        } else if (c === '$') {
          entities.push({
            type: EntityType.math,
            text,
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
    } else if (c === '[' || source.substring(i, i + 2) === '![') {
      const rBracketIndex = nextOccurrenceOf(']', source, i + 1);
      if (rBracketIndex >= 0 && source[rBracketIndex + 1] === '(') {
        const rParenIndex = nextOccurrenceOf(')', source, rBracketIndex + 2);
        if (rParenIndex >= 0) {
          // Link or image.
          commitWip();
          if (c === '[') {
            const text = source.substring(i + 1, rBracketIndex);
            const children = textToEntities(text);
            const href = source.substring(rBracketIndex + 2, rParenIndex);
            entities.push({ type: EntityType.link, href, children });
          } else {
            const alt = source.substring(i + 2, rBracketIndex);
            const src = source.substring(rBracketIndex + 2, rParenIndex);
            entities.push({ type: EntityType.image, alt, src });
          }
          advanceTo(rParenIndex + 1);
          continue;
        }
      } else if (/^\[\^\w+\]/.test(source.substring(i))) {
        // Footnote Ref.
        commitWip();
        const match = /^\[\^(?<key>\w+)\]/.exec(source.substring(i));
        const key = match.groups.key;
        entities.push({ type: EntityType.footnoteRef, key });
        advanceTo(i + match[0].length);
        continue;
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
  let inMath = false;

  for (let i = start; i < source.length; i++) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    const c = source[i];
    if (c === '\\') {
      escapeNext = true;
    } else if (c === marker && !inMono && !inMath) {
      return i;
    } else if (c === '`') {
      inMono = !inMono;
    } else if (c === '$') {
      inMath = !inMath;
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
  | MathEntity
  | LinkEntity
  | FootnoteRefEntity
  | ImageEntity;

export enum EntityType {
  plain = 'plain',
  emph = 'emph',
  strong = 'strong',
  quote = 'quote',
  mono = 'mono',
  math = 'math',
  link = 'link',
  footnoteRef = 'footnoteRef',
  image = 'image',
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

export interface MathEntity extends BaseEntity {
  type: EntityType.math;
  text: string;
}

export interface LinkEntity extends BaseEntity {
  type: EntityType.link;
  href: string;
  children: Entity[];
}

export interface FootnoteRefEntity extends BaseEntity {
  type: EntityType.footnoteRef;
  key: string;
}

export interface ImageEntity extends BaseEntity {
  type: EntityType.image;
  alt: string;
  src: string;
}

interface BaseEntity {
  type: EntityType;
}

function unescapeAll(text: string): string {
  return text.replace(/\\(.)/g, (_, c) => c);
}

function unescapeInMono(text: string): string {
  return text.replace(/\\(`|\\)/g, (_, c) => c);
}

function unescapeInBlockMono(text: string): string {
  return text.replace(/\\```/g, '```');
}
