import React from 'react';
import ReactDOM from 'react-dom/server';
import Note from './components/Note';
import toPlainText from './text/toPlainText';
import parse, { Note as ParsedNote } from './text/parse';
import moveFootnotes from './text/moveFootnotes';
import includesMath from './text/includesMath';

export function generateNoteHtml(source: string, meta: MetaData): string {
  const note = moveFootnotes(parse(source));
  const body = ReactDOM.renderToString(<Note note={note} />);
  const title = extractTitle(note) ?? '';
  const addKatexCss = includesMath(note);

  return template
    .replace('{{title}}', title)
    .replace('{{katexCss}}', addKatexCss ? katexCss : '')
    .replace('{{createdAt}}', formatDate(meta.createdAt))
    .replace('{{updatedAt}}', formatDate(meta.updatedAt))
    .replace('{{body}}', body);
}

export interface MetaData {
  createdAt: Date;
  updatedAt: Date;
}

function extractTitle(note: ParsedNote): string | undefined {
  if (note.blocks[0]?.type === 'heading' && note.blocks[0]?.order === 1) {
    return toPlainText(note.blocks[0].entities);
  }
}

function formatDate(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

const template = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="/main.css" />
    {{katexCss}}
    <title>{{title}}</title>
  </head>

  <body>
    {{body}}
  
    <footer>
      <span>Created: {{createdAt}}</span>
      <span>Last updated: {{updatedAt}}</span>
    </footer>
  </body>
</html>
`.trim();

const katexCss =
  '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" integrity="sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn" crossorigin="anonymous">';
