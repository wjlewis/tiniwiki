import React from 'react';
import { Block as BlockType } from '../text/parse';
import Block from './Block';

export interface BlocksProps {
  blocks: BlockType[];
}

const Blocks: React.FC<BlocksProps> = ({ blocks }) => {
  return (
    <>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </>
  );
};

export default Blocks;
