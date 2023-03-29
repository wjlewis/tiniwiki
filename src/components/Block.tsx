import katex from 'katex';
import React from 'react';
import { Block, BlockType } from '../text/parse';
import toPlainText from '../text/toPlainText';
import Blocks from './Blocks';
import Entities from './Entities';

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
      if (block.order === 1) {
        return <h1>{entities}</h1>;
      } else {
        return <h2>{entities}</h2>;
      }
    }
    case BlockType.code:
      return (
        <pre>
          <code>{block.text}</code>
        </pre>
      );
    case BlockType.math:
      return (
        <div
          className="math"
          dangerouslySetInnerHTML={{
            __html: katex.renderToString(block.text, {
              displayMode: true,
              throwOnError: false,
            }),
          }}
        />
      );
    case BlockType.quote:
      return (
        <blockquote>
          <Blocks blocks={block.children} />
        </blockquote>
      );
    case BlockType.img:
      return (
        <figure>
          <img src={block.src} alt={toPlainText(block.alt)} />

          <figcaption>
            <Entities entities={block.alt} />
          </figcaption>
        </figure>
      );
    case BlockType.ul:
      return (
        <ul>
          {block.items.map((entities, i) => (
            <li key={i}>
              <Entities entities={entities} />
            </li>
          ))}
        </ul>
      );
    case BlockType.ol:
      return (
        <ol>
          {block.items.map((entities, i) => (
            <li key={i}>
              <Entities entities={entities} />
            </li>
          ))}
        </ol>
      );
  }
};

export default Block;
