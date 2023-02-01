import React from 'react';
import NoteLink from './NoteLink';

export interface IndexProps {
  names: string[];
}

const Index: React.FC<IndexProps> = ({ names }) => {
  return (
    <main>
      <h1>Notes</h1>

      <section className="note-links">
        {names.map((name, i) => (
          <NoteLink key={i} name={name} />
        ))}
      </section>
    </main>
  );
};

export default Index;
