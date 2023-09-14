import { generateNoteHtml } from './html';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  if (process.argv.length !== 4) {
    console.error('Usage: tw <in-file.txt> <out-file.html>');
    process.exit(1);
  }

  const inputFilename = process.argv[2];
  const outputFilename = process.argv[3];

  const inputFilepath = path.join(process.cwd(), inputFilename);
  const { birthtime, mtime } = await fs.stat(inputFilepath);
  const text = await fs.readFile(inputFilepath, 'utf-8');
  const html = generateNoteHtml(text, {
    createdAt: birthtime,
    updatedAt: mtime,
  });

  const outputFilepath = path.join(process.cwd(), outputFilename);
  await fs.writeFile(outputFilepath, html);
}

main();
