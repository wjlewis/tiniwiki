import * as fs from 'fs/promises';
import * as path from 'path';
import { renderArticle } from './layout';

async function main() {
  await buildAll();
  return Promise.all([watchTextFiles(), watchAssets()]);
}

async function watchTextFiles() {
  for await (const event of fs.watch(process.cwd())) {
    const { filename } = event;
    if (path.extname(filename) === '.txt') {
      await buildFile(filename);
    }
  }
}

async function watchAssets() {
  for await (const _event of fs.watch(path.join(process.cwd(), 'assets'))) {
    await copyAssets();
  }
}

async function buildAll() {
  const basePath = process.cwd();
  const filenames = await fs.readdir(basePath);

  if (!filenames.includes('dist')) {
    await fs.mkdir(path.join(basePath, 'dist'));
  }

  if (filenames.includes('assets')) {
    await copyAssets();
  }

  const textFiles = filenames.filter(name => path.extname(name) === '.txt');
  await Promise.all(textFiles.map(buildFile));
}

async function copyAssets() {
  const basePath = process.cwd();
  console.log('copying assets');
  await fs.cp(
    path.join(basePath, 'assets'),
    path.join(basePath, 'dist', 'assets'),
    { recursive: true }
  );
}

async function buildFile(filename: string): Promise<void> {
  const basePath = process.cwd();
  const text = await fs.readFile(path.join(basePath, filename), 'utf-8');
  const html = renderArticle(text);
  const withoutExt = filename.split('.').slice(0, -1).join('.');
  const outFilename = `${withoutExt}.html`;
  console.log(`writing ${outFilename}`);
  return fs.writeFile(path.join(basePath, 'dist', outFilename), html);
}

main();
