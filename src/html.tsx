import React from 'react';
import ReactDOM from 'react-dom/server';
import Note from './components/Note';
import toPlainText from './text/toPlainText';
import parse, { Note as ParsedNote } from './text/parse';
import moveFootnotes from './text/moveFootnotes';
import includesMath from './text/includesMath';

export function generateNoteHtml(source: string): string {
  const note = moveFootnotes(parse(source));
  const body = ReactDOM.renderToString(<Note note={note} />);
  const title = extractTitle(note) ?? '';
  const addKatexCss = includesMath(note);

  return template
    .replace('{{title}}', title)
    .replace('{{katex-css}}', addKatexCss ? katexCss : '')
    .replace('{{body}}', body);
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
    {{katex-css}}
    <title>{{title}}</title>
  </head>

  <body>
    {{body}}
  </body>
</html>
`.trim();

const katexCss =
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn" crossorigin="anonymous">';
