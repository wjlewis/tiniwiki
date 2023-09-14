import {
  Block,
  BlockType,
  Entity,
  EntityType,
  FootnoteBlock,
  Note,
} from './parse';

export default function includesMath(note: Note): boolean {
  return note.blocks.some(blockIncludesMath);
}

function blockIncludesMath(block: Block): boolean {
  switch (block.type) {
    case BlockType.para:
    case BlockType.heading:
      return block.entities.some(entityIncludesMath);
    case BlockType.pre:
      return false;
    case BlockType.math:
      return true;
    case BlockType.quote:
      return block.children.some(blockIncludesMath);
    case BlockType.list:
      return block.items.some(blocks => blocks.some(blockIncludesMath));
    case BlockType.footnote:
      return block.children.some(blockIncludesMath);
  }
}

function entityIncludesMath(entity: Entity): boolean {
  switch (entity.type) {
    case EntityType.plain:
      return false;
    case EntityType.emph:
    case EntityType.strong:
    case EntityType.quote:
      return entity.children.some(entityIncludesMath);
    case EntityType.mono:
      return false;
    case EntityType.math:
      return true;
    case EntityType.link:
      return entity.children.some(entityIncludesMath);
    case EntityType.footnoteRef:
    case EntityType.image:
      return false;
  }
}
