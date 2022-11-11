import { extractBlocks, Block } from './blocks';

export {
  Block,
  BlockType,
  HeadingBlock,
  ParaBlock,
  CodeBlock,
  MathBlock,
  QuoteBlock,
  FootnoteBlock,
} from './blocks';
export {
  Entity,
  EntityType,
  SimpleEntityType,
  CompoundEntityType,
  TextEntity,
  SimpleEntity,
  CompoundEntity,
  FootnoteRefEntity,
  LinkEntity,
  ImgEntity,
} from './entities';

export function parse(text: string): Block[] {
  return extractBlocks(text);
}
