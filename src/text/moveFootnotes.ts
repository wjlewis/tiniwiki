import {
  Block,
  BlockType,
  Entity,
  EntityType,
  FootnoteBlock,
  Note,
} from './parse';
import { sortBy, unique } from '../tools';

export default function moveFootnotes(note: Note): Note {
  const { blocks, footnotes } = partitionBlocks(note.blocks);
  const keys = footnoteKeysInBlocks(note.blocks);
  const keyIndexMap = keys.reduce(
    (map, key, i) => ({ ...map, [key]: i + 1 }),
    {}
  );

  const reKeyedFootnotes = reKeyBlocks(footnotes, keyIndexMap);
  const sortedFootnotes = sortBy(reKeyedFootnotes as FootnoteBlock[], block =>
    Number(block.key)
  );

  return {
    blocks: [...reKeyBlocks(blocks, keyIndexMap), ...sortedFootnotes],
  };
}

function partitionBlocks(blocks: Block[]): BlocksWithFootnotes {
  return blocks.reduce(
    ({ blocks, footnotes }, block) => {
      switch (block.type) {
        case BlockType.para:
        case BlockType.heading:
        case BlockType.pre:
          return { blocks: [...blocks, block], footnotes };
        case BlockType.quote: {
          const res = partitionBlocks(block.children);
          return {
            blocks: [...blocks, ...res.blocks],
            footnotes: [...footnotes, ...res.footnotes],
          };
        }
        case BlockType.list: {
          const res = block.items.reduce(
            ({ blocks, footnotes }, item) => {
              const res = partitionBlocks(item);
              return {
                blocks: [...blocks, ...res.blocks],
                footnotes: [...footnotes, ...res.footnotes],
              };
            },
            { blocks: [], footnotes: [] } as BlocksWithFootnotes
          );

          return {
            blocks: [...blocks, ...res.blocks],
            footnotes: [...footnotes, ...res.footnotes],
          };
        }
        case BlockType.footnote:
          return { blocks, footnotes: [...footnotes, block] };
      }
    },
    { blocks: [], footnotes: [] } as BlocksWithFootnotes
  );
}

interface BlocksWithFootnotes {
  blocks: Block[];
  footnotes: FootnoteBlock[];
}

function footnoteKeysInBlocks(blocks: Block[]): string[] {
  return unique(blocks.flatMap(footnoteKeysInBlock));
}

function footnoteKeysInBlock(block: Block): string[] {
  switch (block.type) {
    case BlockType.para:
      return footnoteKeysInEntities(block.entities);
    case BlockType.heading:
      return footnoteKeysInEntities(block.entities);
    case BlockType.pre:
      return [];
    case BlockType.quote:
      return footnoteKeysInBlocks(block.children);
    case BlockType.list:
      return block.items.flatMap(item => footnoteKeysInBlocks(item));
    case BlockType.footnote:
      return footnoteKeysInBlocks(block.children);
  }
}

function footnoteKeysInEntities(entities: Entity[]): string[] {
  return entities.flatMap(footnoteKeysInEntity);
}

function footnoteKeysInEntity(entity: Entity): string[] {
  switch (entity.type) {
    case EntityType.plain:
      return [];
    case EntityType.emph:
    case EntityType.strong:
    case EntityType.quote:
      return footnoteKeysInEntities(entity.children);
    case EntityType.mono:
      return [];
    case EntityType.link:
      return footnoteKeysInEntities(entity.children);
    case EntityType.footnoteRef:
      return [entity.key];
  }
}

type KeyIndexMap = { [key: string]: number };

function reKeyBlocks(blocks: Block[], map: KeyIndexMap): Block[] {
  return blocks.map(block => reKeyBlock(block, map));
}

function reKeyBlock(block: Block, map: KeyIndexMap): Block {
  switch (block.type) {
    case BlockType.para:
      return {
        ...block,
        entities: reKeyEntities(block.entities, map),
      };
    case BlockType.heading:
      return {
        ...block,
        entities: reKeyEntities(block.entities, map),
      };
    case BlockType.pre:
      return block;
    case BlockType.quote:
      return {
        ...block,
        children: reKeyBlocks(block.children, map),
      };
    case BlockType.list:
      return {
        ...block,
        items: block.items.map(item => reKeyBlocks(item, map)),
      };
    case BlockType.footnote:
      return {
        ...block,
        key: String(map[block.key]),
        children: reKeyBlocks(block.children, map),
      };
  }
}

function reKeyEntities(entities: Entity[], map: KeyIndexMap): Entity[] {
  return entities.map(entity => reKeyEntity(entity, map));
}

function reKeyEntity(entity: Entity, map: KeyIndexMap): Entity {
  switch (entity.type) {
    case EntityType.plain:
      return entity;
    case EntityType.emph:
    case EntityType.strong:
    case EntityType.quote:
      return {
        ...entity,
        children: reKeyEntities(entity.children, map),
      };
    case EntityType.mono:
      return entity;
    case EntityType.link:
      return {
        ...entity,
        children: reKeyEntities(entity.children, map),
      };
    case EntityType.footnoteRef:
      return {
        ...entity,
        key: String(map[entity.key]),
      };
  }
}
