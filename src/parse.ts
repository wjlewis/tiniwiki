export default function parse(text: string): Note {
  return { blocks: parseBlocks(text) };
}

export interface Note {
  blocks: Block[];
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split('\n');

  let i = 0;
  let wipIdx = 0;

  function advance() {
    i += 1;
  }

  function jump(to: number) {
    i = to;
    wipIdx = to;
  }

  function commitPara(upTo: number) {
    if (upTo > wipIdx) {
      const text = lines.slice(wipIdx, upTo).join('\n');
      const entities = parseEntities(text);
      blocks.push({ type: BlockType.para, entities });
    }
  }

  function addBlock(endIdx: number, fn: (text: string) => Block) {
    commitPara(i);
    const text = lines.slice(i + 1, endIdx).join('\n');
    blocks.push(fn(text));
    jump(endIdx + 1);
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line[0] === '#') {
      addBlock(i, () => {
        let order = 0;
        while (line[order] === '#' && order <= 2) {
          order += 1;
        }
        const text = line.slice(order).trim();
        const entities = parseEntities(text);
        return { type: BlockType.heading, order, entities };
      });
    } else if (line.startsWith('```')) {
      const closeIdx = findNextBlockMarker(lines, i + 1, '```');
      if (closeIdx < 0) {
        advance();
      } else {
        addBlock(closeIdx, text => {
          const lang = line.slice(3).trim();
          return {
            type: BlockType.code,
            text,
            lang: lang.length > 0 ? lang : undefined,
          };
        });
      }
    } else if (line.startsWith('$$')) {
      const closeIdx = findNextBlockMarker(lines, i + 1, '$$');
      if (closeIdx < 0) {
        advance();
      } else {
        addBlock(closeIdx, text => ({
          type: BlockType.math,
          text,
        }));
      }
    } else if (line.startsWith('>>>')) {
      const closeIdx = findNextBlockMarker(lines, i + 1, '>>>');
      if (closeIdx < 0) {
        advance();
      } else {
        addBlock(closeIdx, text => {
          const children = parseBlocks(text);
          return { type: BlockType.quote, children };
        });
      }
    } else if (line.startsWith('![')) {
      const midPos = findNextInlineMarker(line, 2, '](', ']');
      if (midPos < 0) {
        advance();
      } else {
        const closePos = findNextInlineMarker(line, midPos + 2, ')');
        if (closePos < 0) {
          advance();
        } else {
          addBlock(i, () => {
            const src = line.slice(midPos + 2, closePos);
            const alt = parseEntities(line.slice(2, midPos));
            return { type: BlockType.img, src, alt };
          });
        }
      }
    } else if (/^(- )|(\d+\.)/.test(line)) {
      const ordered = !line.startsWith('- ');
      const closePos = findListClosePos(lines, i, ordered);
      addBlock(closePos, () => {
        const collected = collectListLines(lines.slice(i, closePos));
        const items = collected.map(parseEntities);
        const type = ordered ? BlockType.ol : BlockType.ul;
        return { type, items };
      });
    } else if (line.trim().length === 0) {
      commitPara(i);
      jump(i + 1);
    } else {
      advance();
    }
  }

  commitPara(lines.length);

  return blocks;
}

function findNextBlockMarker(
  lines: string[],
  start: number,
  marker: string
): number {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].startsWith(marker)) {
      return i;
    }
  }
  return lines.length;
}

function findListClosePos(
  lines: string[],
  start: number,
  ordered: boolean
): number {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].trim().length === 0) {
      return i;
    } else if (
      lines[i].startsWith(' ') ||
      (ordered && /^\d+\./.test(lines[i])) ||
      (!ordered && lines[i].startsWith('- '))
    ) {
      continue;
    } else {
      return i;
    }
  }
  return lines.length;
}

function collectListLines(lines: string[]): string[] {
  const collected: string[] = [];
  let wip: string[] = [];

  function commitWip() {
    if (wip.length > 0) {
      collected.push(wip.join(' '));
    }
    wip = [];
  }

  for (const line of lines) {
    if (line.startsWith(' ')) {
      wip.push(line.trim());
    } else {
      commitWip();
      const [_first, ...rest] = line.split(' ');
      wip.push(rest.join(' '));
    }
  }

  commitWip();
  return collected;
}

export type Block =
  | ParaBlock
  | HeadingBlock
  | CodeBlock
  | MathBlock
  | QuoteBlock
  | ImgBlock
  | UlBlock
  | OlBlock;

export enum BlockType {
  para = 'para',
  heading = 'heading',
  code = 'code',
  math = 'math',
  quote = 'quote',
  img = 'img',
  ul = 'ul',
  ol = 'ol',
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

export interface CodeBlock extends BaseBlock {
  type: BlockType.code;
  lang?: string;
  text: string;
}

export interface MathBlock extends BaseBlock {
  type: BlockType.math;
  text: string;
}

export interface QuoteBlock extends BaseBlock {
  type: BlockType.quote;
  children: Block[];
}

export interface ImgBlock extends BaseBlock {
  type: BlockType.img;
  src: string;
  alt: Entity[];
}

export interface UlBlock extends BaseBlock {
  type: BlockType.ul;
  items: Array<Entity[]>;
}

export interface OlBlock extends BaseBlock {
  type: BlockType.ol;
  items: Array<Entity[]>;
}

interface BaseBlock {
  type: BlockType;
}

function parseEntities(text: string): Entity[] {
  const entities: Entity[] = [];

  let pos = 0;
  let wipPos = 0;

  function advance() {
    pos += 1;
  }

  function jump(to: number) {
    pos = to;
    wipPos = to;
  }

  function commitPlain(upTo: number) {
    if (upTo > wipPos) {
      const plain = text.slice(wipPos, upTo);
      entities.push({ type: EntityType.plain, text: plain });
    }
  }

  // Add an entity that spans `pos` to `closePos`.
  function addEntity(closePos: number, entity: Entity) {
    commitPlain(pos);
    entities.push(entity);
    jump(closePos + 1);
  }

  while (pos < text.length) {
    if (['`', '$'].includes(text[pos])) {
      const marker = text[pos];
      const closePos = findNextInlineMarker(text, pos + 1, marker);
      if (closePos < 0) {
        advance();
      } else {
        const type = marker === '`' ? EntityType.mono : EntityType.math;
        const innerText = text.slice(pos + 1, closePos);
        addEntity(closePos, { type, text: innerText });
      }
    } else if (['_', '*', '"'].includes(text[pos])) {
      const marker = text[pos];
      const closePos = findNextInlineMarker(text, pos + 1, marker);
      if (closePos < 0) {
        advance();
      } else {
        const innerText = text.slice(pos + 1, closePos);
        const children = parseEntities(innerText);
        const type = {
          _: EntityType.emph,
          '*': EntityType.strong,
          '"': EntityType.quote,
        }[marker];
        addEntity(closePos, { type, children } as Entity);
      }
    } else if (text[pos] === '[') {
      const midPos = findNextInlineMarker(text, pos + 1, '](', ']');
      if (midPos < 0) {
        advance();
      } else {
        const closePos = findNextInlineMarker(text, midPos + 2, ')');
        if (closePos < 0) {
          advance();
        } else {
          const linkText = text.slice(pos + 1, midPos);
          const href = text.slice(midPos + 2, closePos);
          const children = parseEntities(linkText);
          addEntity(closePos, { type: EntityType.link, href, children });
        }
      }
    } else {
      advance();
    }
  }

  commitPlain(text.length);

  return entities;
}

function findNextInlineMarker(
  text: string,
  start: number,
  marker: string,
  ...avoid: string[]
): number {
  for (let i = start; i < text.length; i++) {
    if (text.slice(i).startsWith(marker)) {
      return i;
    } else if (avoid.some(a => text.slice(i).startsWith(a))) {
      break;
    }
  }
  return -1;
}

export function entitiesToPlain(entities: Entity[]): string {
  return entities.map(entityToPlain).join('');
}

export function entityToPlain(entity: Entity): string {
  switch (entity.type) {
    case EntityType.plain:
      return entity.text;
    case EntityType.emph:
    case EntityType.strong:
    case EntityType.quote:
      return entitiesToPlain(entity.children);
    case EntityType.mono:
      return entity.text;
    case EntityType.math:
      return 'math';
    case EntityType.link:
      return entitiesToPlain(entity.children);
  }
}

export type Entity =
  | PlainEntity
  | EmphEntity
  | StrongEntity
  | QuoteEntity
  | MonoEntity
  | MathEntity
  | LinkEntity;

export enum EntityType {
  plain = 'plain',
  emph = 'emph',
  strong = 'strong',
  quote = 'quote',
  mono = 'mono',
  math = 'math',
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

export interface MathEntity extends BaseEntity {
  type: EntityType.math;
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
