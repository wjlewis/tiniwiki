import katex from 'katex';
import React from 'react';
import { Block, BlockType, entitiesToPlain } from '../parse';
import Blocks from './Blocks';
import Entities from './Entities';

export interface BlockProps {
  block: Block;
  withinBlockquote?: boolean;
}

const Block: React.FC<BlockProps> = ({ block, withinBlockquote }) => {
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
        if (withinBlockquote) {
          return <h2>{entities}</h2>;
        } else {
          const id = entitiesToPlain(block.entities)
            .toLowerCase()
            .split(' ')
            .join('-');
          return (
            <div className="subsection-link" id={id}>
              <a href={`#${id}`}>§</a>
              <h2>{entities}</h2>
            </div>
          );
        }
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
          <Blocks blocks={block.children} withinBlockquote />
        </blockquote>
      );
    case BlockType.img:
      return (
        <figure>
          <img src={block.src} alt={entitiesToPlain(block.alt)} />

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
