import { Entity, extractEntities } from './entities';

export function extractBlocks(text: string): Block[] {
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
      const content = extractEntities(text);
      blocks.push({ type: BlockType.para, content });
    }
  }

  function addBlock(endIdx: number, fn: (text: string) => Block) {
    commitPara(i);
    const text = lines.slice(i + 1, endIdx - 1).join('\n');
    blocks.push(fn(text));
    jump(endIdx);
  }

  while (i < lines.length) {
    const line = lines[i];

    if (line[0] === '#') {
      addBlock(i + 1, () => {
        let order = 0;
        while (line[order] === '#' && order < 6) {
          order += 1;
        }
        const text = line.slice(order).trim();
        const content = extractEntities(text);
        return { type: BlockType.heading, content, order };
      });
    } else if (line.startsWith('```')) {
      const closeIdx = findNextBlockMarker(lines, i + 1, '```');
      if (closeIdx < 0) {
        advance();
      } else {
        addBlock(closeIdx + 1, text => {
          const meta = line.slice(3).split(',');
          const lang = meta[0].trim();
          const descText = meta.slice(1).join(',').trim();
          const desc = extractEntities(descText);
          return { type: BlockType.code, text, lang, desc };
        });
      }
    } else if (line.startsWith('$$')) {
      const closeIdx = findNextBlockMarker(lines, i + 1, '$$');
      if (closeIdx < 0) {
        advance();
      } else {
        addBlock(closeIdx + 1, text => {
          const descText = line.slice(2).trim();
          const desc = extractEntities(descText);
          return { type: BlockType.math, text, desc };
        });
      }
    } else if (line.startsWith('>>>')) {
      const closeIdx = findNextBlockMarker(lines, i + 1, '>>>');
      if (closeIdx < 0) {
        advance();
      } else {
        addBlock(closeIdx + 1, text => {
          const children = extractBlocks(text);
          const descText = line.slice(3).trim();
          const desc = extractEntities(descText);
          return { type: BlockType.quote, children, desc };
        });
      }
    } else if (line.startsWith('^^^')) {
      const closeIdx = findNextBlockMarker(lines, i + 1, '^^^');
      if (closeIdx < 0) {
        advance();
      } else {
        addBlock(closeIdx + 1, text => {
          const children = extractBlocks(text);
          const ref = line.slice(3).trim();
          return { type: BlockType.footnote, children, ref };
        });
      }
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

function findNextBlockMarker(lines: string[], start: number, marker: string) {
  for (let i = start; i < lines.length; i++) {
    if (lines[i].startsWith(marker)) {
      return i;
    }
  }
  return -1;
}

export type Block =
  | HeadingBlock
  | ParaBlock
  | CodeBlock
  | MathBlock
  | QuoteBlock
  | FootnoteBlock;

export enum BlockType {
  heading = 'HEADING',
  para = 'PARA',
  code = 'CODE',
  math = 'MATH',
  quote = 'QUOTE',
  footnote = 'FOOTNOTE',
}

export interface HeadingBlock extends BaseBlock {
  type: BlockType.heading;
  content: Entity[];
  order: number;
}

export interface ParaBlock extends BaseBlock {
  type: BlockType.para;
  content: Entity[];
}

export interface CodeBlock extends BaseBlock {
  type: BlockType.code;
  text: string;
  lang: string;
  desc: Entity[];
}

export interface MathBlock extends BaseBlock {
  type: BlockType.math;
  text: string;
  desc: Entity[];
}

export interface QuoteBlock extends BaseBlock {
  type: BlockType.quote;
  children: Block[];
  desc: Entity[];
}

export interface FootnoteBlock extends BaseBlock {
  type: BlockType.footnote;
  children: Block[];
  ref: string;
}

interface BaseBlock {
  type: BlockType;
}
