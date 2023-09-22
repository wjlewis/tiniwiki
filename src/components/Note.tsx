import React from 'react';
import { Block } from '../text/parse';
import Blocks from './Blocks';

export interface NoteProps {
  blocks: Block[];
  footnotes: Block[];
}

const Note: React.FC<NoteProps> = ({ blocks, footnotes }) => {
  return (
    <main>
      <Blocks blocks={blocks} />

      <div className="footnotes">
        <Blocks blocks={footnotes} />
      </div>
    </main>
  );
};

export default Note;
