import React from 'react';
import { Note } from '../parse';
import Blocks from './Blocks';

export interface NoteProps {
  note: Note;
}

const Note: React.FC<NoteProps> = ({ note }) => {
  return (
    <main>
      <Blocks blocks={note.blocks} />
    </main>
  );
};

export default Note;
