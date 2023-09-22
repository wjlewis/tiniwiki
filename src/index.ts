import { generateNoteHtml } from './html';
import fs from 'fs/promises';
import path from 'path';

async function main() {
  if (process.argv.length < 4) {
    console.error(
      'Usage: tw <in-file.txt> <out-file.html> [<extra-header-content> ...]'
    );
    process.exit(1);
  }

  const inputFilename = process.argv[2];
  const outputFilename = process.argv[3];
  const headerContents = process.argv.slice(4);

  const inputFilepath = path.join(process.cwd(), inputFilename);
  const text = await fs.readFile(inputFilepath, 'utf-8');
  const html = generateNoteHtml(text, headerContents);

  const outputFilepath = path.join(process.cwd(), outputFilename);
  await fs.writeFile(outputFilepath, html);
}

main();
