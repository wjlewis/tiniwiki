import React from 'react';
import { Block, BlockType } from '../text/parse';
import Blocks from './Blocks';
import Entities from './Entities';
import highlight from '../hl/highlight';
import toPlainText from '../text/toPlainText';

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
      const id = toPlainText(block.entities).replace(/\s+/g, '-');
      const Tag = `h${block.order}` as keyof JSX.IntrinsicElements;
      return <Tag id={id}>{entities}</Tag>;
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
    case BlockType.list: {
      const items = block.items.map((block, i) => (
        <li key={i}>
          <Blocks blocks={block} />
        </li>
      ));
      return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>;
    }
    case BlockType.footnote: {
      const id = `__footnote_${block.key}`;
      const href = `#__footnote_ref_${block.key}`;
      return (
        <div id={id} className="footnote">
          <a href={href}>[{block.key}]</a>

          <div className="footnote-content">
            <Blocks blocks={block.children} />
          </div>
        </div>
      );
    }
  }
};

export default Block;
