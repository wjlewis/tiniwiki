import React from 'react';
import ReactDOM from 'react-dom/server';
import Index from './components/Index';
import Note from './components/Note';
import parse from './parse';

export function generateNoteHtml(
  text: string,
  title: string,
  template: string
): string {
  const note = parse(text);
  const body = ReactDOM.renderToString(<Note note={note} />);

  return template.replace('{{title}}', title).replace('{{body}}', body);
}

export function generateIndexHtml(names: string[], template: string): string {
  const body = ReactDOM.renderToString(<Index names={names} />);

  return template.replace('{{title}}', 'Notes').replace('{{body}}', body);
}
