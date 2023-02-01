import { Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import { generateNoteHtml, generateIndexHtml } from './html';

export default async function compose(dirpath: string): Promise<void> {
  const templates = await loadTemplates();
  await buildAll(dirpath, templates);
  await watchNotes(dirpath, templates);
}

async function watchNotes(
  dirpath: string,
  templates: Templates
): Promise<void> {
  for await (const event of fs.watch(dirpath)) {
    const { filename } = event;
    try {
      await buildNote(dirpath, filename, templates.note);
    } catch {}
  }
}

async function buildAll(dirpath: string, templates: Templates): Promise<void> {
  const outdir = path.join(dirpath, 'dist');
  await fs.rm(outdir, { force: true, recursive: true });
  await fs.mkdir(outdir);

  await copyStyles(dirpath);
  await buildNotesAndIndex(dirpath, templates);
  await copyAssets(dirpath);
}

async function buildNotesAndIndex(
  dirpath: string,
  templates: Templates
): Promise<void> {
  const entries = await fs.readdir(dirpath, { withFileTypes: true });
  const noteEntries = entries.filter(isTextFile);

  await Promise.all([
    buildNotes(dirpath, noteEntries, templates.note),
    buildIndex(dirpath, noteEntries, templates.index),
  ]);
}

async function buildNotes(
  dirpath: string,
  entries: Dirent[],
  template: string
): Promise<void> {
  await Promise.all(
    entries.map(entry => buildNote(dirpath, entry.name, template))
  );
}

async function buildNote(
  dirpath: string,
  filename: string,
  template: string
): Promise<void> {
  const text = await fs.readFile(path.join(dirpath, filename), 'utf-8');
  const { name } = path.parse(filename);
  const title = name.replace(/_/g, ' ');

  const html = generateNoteHtml(text, title, template);

  const artifactName = path.format({ name, ext: '.html' });
  const artifactPath = path.join(dirpath, 'dist', artifactName);
  return fs.writeFile(artifactPath, html);
}

async function buildIndex(
  dirpath: string,
  entries: Dirent[],
  template: string
): Promise<void> {
  const names = entries.map(entry => path.parse(entry.name).name);
  const html = generateIndexHtml(names, template);
  return fs.writeFile(path.join(dirpath, 'dist', 'index.html'), html);
}

async function copyAssets(dirpath: string): Promise<void> {
  const assetPath = path.join(dirpath, 'assets');
  try {
    const stats = await fs.stat(assetPath);
    if (stats.isDirectory()) {
      await fs.cp(assetPath, path.join(dirpath, 'dist', 'assets'), {
        recursive: true,
      });
    }
  } catch {}
}

function isTextFile(entry: Dirent): boolean {
  return entry.isFile && path.parse(entry.name).ext === '.txt';
}

async function loadTemplates(): Promise<Templates> {
  const [note, index] = await Promise.all(
    ['note-template', 'index-template'].map(name =>
      fs.readFile(path.join(__dirname, 'assets', `${name}.html`), 'utf-8')
    )
  );

  return { note, index };
}

interface Templates {
  note: string;
  index: string;
}

function copyStyles(dirpath: string): Promise<void> {
  return fs.cp(
    path.join(__dirname, 'assets', 'main.css'),
    path.join(dirpath, 'dist', 'main.css')
  );
}
