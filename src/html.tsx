import React from 'react';
import ReactDOM from 'react-dom/server';
import Note from './components/Note';
import toPlainText from './text/toPlainText';
import parse, { Note as ParsedNote } from './text/parse';

export function generateNoteHtml(
  text: string,
  filename: string,
  styleFilenames: string[],
  template: string
): string {
  const note = parse(text);
  const body = ReactDOM.renderToString(<Note note={note} />);
  const title = extractTitle(note) ?? filename.replaceAll('_', ' ');
  const styleTags = styleFilenames.map(createStyleTag).join('');

  return template
    .replace('{{title}}', title)
    .replace('{{styles}}', styleTags)
    .replace('{{body}}', body);
}

function extractTitle(note: ParsedNote): string | undefined {
  if (note.blocks[0]?.type === 'heading' && note.blocks[0]?.order === 1) {
    return toPlainText(note.blocks[0].entities);
  }
}

function createStyleTag(styleFilename: string): string {
  const href = `./assets/${styleFilename}`;
  return `<link rel="stylesheet" href="${href}" />`;
}
