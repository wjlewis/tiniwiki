import React from 'react';

export interface NoteLinkProps {
  name: string;
}

const NoteLink: React.FC<NoteLinkProps> = ({ name }) => {
  const title = name.replace(/_/g, ' ');

  return <a href={`${name}.html`}>{title}</a>;
};

export default NoteLink;
