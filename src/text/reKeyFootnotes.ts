import { Block, BlockType, Entity, EntityType, Note } from './parse';

export default function reKeyFootnotes(note: Note): Note {
  // Create a map of indexes in order of appearance.
  // Map over blocks, replacing keys with indexes.
  const keys = footnoteKeysInBlocks(note.blocks);
  const keyIndexMap = keys.reduce(
    (map, key, i) => ({ ...map, [key]: i + 1 }),
    {}
  );

  return {
    blocks: reKeyBlocks(note.blocks, keyIndexMap),
  };
}

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

type KeyIndexMap = { [key: string]: number };

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

/**
 * Remove duplicates, leaving only the _first_ occurrence of each distinct item
 * in `xs`.
 */
function unique<T>(xs: T[]): T[] {
  const seen = new Set();
  const out: T[] = [];
  for (const x of xs) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }

  return out;
}
