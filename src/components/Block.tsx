import React from 'react';
import { Block, BlockType } from '../text/parse';
import toPlainText from '../text/toPlainText';
import Blocks from './Blocks';
import Entities from './Entities';
import highlight from '../hl/highlight';

export interface BlockProps {
  block: Block;
}

const Block: React.FC<BlockProps> = ({ block }) => {
  switch (block.type) {
    case BlockType.para:
      return (
        <p>
          <Entities entities={block.entities} />
        </p>
      );
    case BlockType.heading: {
      const entities = <Entities entities={block.entities} />;
      const Tag = `h${block.order}` as keyof JSX.IntrinsicElements;
      return <Tag>{entities}</Tag>;
    }
    case BlockType.pre:
      return (
        <pre>
          <code>{highlight(block.text, block.meta)}</code>
        </pre>
      );
    case BlockType.quote:
      return (
        <blockquote>
          <Blocks blocks={block.children} />
        </blockquote>
      );
    case BlockType.list:
      const items = block.items.map((block, i) => (
        <li key={i}>
          <Block block={block} />
        </li>
      ));
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
  }
};

export default Block;
