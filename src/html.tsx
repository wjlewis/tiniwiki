import React from 'react';
import ReactDOM from 'react-dom/server';
import Note from './components/Note';
import toPlainText from './text/toPlainText';
import parse, { Note as ParsedNote } from './text/parse';
import moveFootnotes from './text/moveFootnotes';

export function generateNoteHtml(source: string): string {
  const note = moveFootnotes(parse(source));
  const body = ReactDOM.renderToString(<Note note={note} />);
  const title = extractTitle(note) ?? '';

  return template.replace('{{title}}', title).replace('{{body}}', body);
}

function extractTitle(note: ParsedNote): string | undefined {
  if (note.blocks[0]?.type === 'heading' && note.blocks[0]?.order === 1) {
    return toPlainText(note.blocks[0].entities);
  }
}

const template = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/main.css" />
    <title>{{title}}</title>
  </head>

  <body>
    {{body}}
  </body>
</html>
`.trim();
