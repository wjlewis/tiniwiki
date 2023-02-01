import React from 'react';
import { Block as BlockType } from '../parse';
import Block from './Block';

export interface BlocksProps {
  blocks: BlockType[];
  withinBlockquote?: boolean;
}

const Blocks: React.FC<BlocksProps> = ({ blocks, withinBlockquote }) => {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} withinBlockquote={withinBlockquote} />
      ))}
    </>
  );
};

export default Blocks;
