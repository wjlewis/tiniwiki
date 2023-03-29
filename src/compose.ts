import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { generateNoteHtml } from './html';

export default async function compose(dirpath: string): Promise<void> {
  await createOutputDirectories(dirpath);

  const globs = ['*.txt', 'assets/*'].map(glob => `${dirpath}/${glob}`);

  chokidar.watch(globs).on('all', (event, filepath) => {
    handleEvent(event, filepath, dirpath);
  });
}

async function createOutputDirectories(dirpath: string): Promise<void> {
  await fs.mkdir(path.join(dirpath, 'dist', 'assets'), { recursive: true });
}

async function handleEvent(
  event: string,
  filepath: string,
  dirpath: string
): Promise<void> {
  const relFilepath = path.relative(dirpath, filepath);
  const parsed = path.parse(relFilepath);
  const isTextFile = parsed.ext === '.txt';
  const isAsset = parsed.dir === 'assets';
  const distFilepath = path.join(
    dirpath,
    'dist',
    isTextFile ? `${parsed.name}.html` : relFilepath
  );
  const isStyleFile = isAsset && parsed.ext === '.css';

  switch (event) {
    case 'add':
    case 'change': {
      console.log(chalk.green(`[${event}]`), parsed.base);

      if (event === 'add' && isStyleFile) {
        // A style file has been added: rebuild all notes.
        loadStyleFilenames.bust();
        console.log(
          chalk.green(`Added ${parsed.base}. Rebuilding all notes...`)
        );
        return buildNotes(dirpath);
      } else if (isAsset) {
        return fs.copyFile(filepath, distFilepath);
      } else if (isTextFile) {
        return buildNote(dirpath, relFilepath);
      }
    }
    case 'unlink': {
      console.log(chalk.red('[remove]', parsed.base));
      if (isStyleFile) {
        // A style file has been removed: rebuild all notes.
        loadStyleFilenames.bust();
        await buildNotes(dirpath);

        console.log(
          chalk.red(`Removed ${parsed.base}. Rebuilding all notes...`)
        );
        return;
      } else if (isTextFile) {
        return fs.unlink(distFilepath);
      }
    }
  }
}

async function buildNotes(dirpath: string): Promise<void> {
  const entries = await fs.readdir(dirpath, { withFileTypes: true });
  const noteEntries = entries
    .filter(entry => entry.isFile && path.parse(entry.name).ext === '.txt')
    .map(entry => entry.name);

  await Promise.all(noteEntries.map(filename => buildNote(dirpath, filename)));
}

const buildNote = batchDebounce(
  async (dirpath: string, filename: string): Promise<void> => {
    const [template, styleFilenames] = await Promise.all([
      loadTemplate(),
      loadStyleFilenames(dirpath),
    ]);

    const text = await fs.readFile(path.join(dirpath, filename), 'utf-8');
    const { name } = path.parse(filename);

    const html = generateNoteHtml(text, name, styleFilenames, template);

    const artifactName = path.format({ name, ext: '.html' });
    const artifactPath = path.join(dirpath, 'dist', artifactName);
    await fs.writeFile(artifactPath, html);

    console.log(chalk.blue('[built]'), filename);
    return;
  },
  ([_dirpath, filename]) => filename,
  500
);

const loadTemplate = debounceMemo(async (): Promise<string> => {
  const template = await fs.readFile(
    path.join(__dirname, 'assets', 'note-template.html'),
    'utf-8'
  );

  console.log(chalk.magenta('[load]'), 'note template');
  return template;
}, 500);

const loadStyleFilenames = debounceMemo(
  async (dirpath: string): Promise<string[]> => {
    const assetPath = path.join(dirpath, 'assets');
    try {
      const entries = await fs.readdir(assetPath, { withFileTypes: true });
      const cssEntries = entries
        .filter(entry => entry.isFile && path.parse(entry.name).ext === '.css')
        .map(entry => entry.name);

      console.log(chalk.magenta('[load]'), 'CSS filenames');
      return cssEntries;
    } catch {}

    return [];
  },
  500
);

function batchDebounce(
  fn: (...args: any[]) => any,
  keyFn: KeyFn,
  delay: number
): (...args: any[]) => any {
  const reqs: { [key: string]: BatchDebounceRequest } = {};

  return (...args) => {
    const key = keyFn(args);

    if (key in reqs) {
      const req = reqs[key];
      clearTimeout(req.timeout);
      req.timeout = setTimeout(() => {
        const result = fn(...req.args);
        req.resolver(result);
      }, delay);

      return req.promise;
    }

    let resolver: (value: any) => any;
    const promise = new Promise(resolve => {
      resolver = resolve;
    });
    const timeout = setTimeout(() => {
      const result = fn(...args);
      resolver(result);
    }, delay);

    reqs[key] = {
      args,
      promise,
      resolver,
      timeout,
    };

    return promise;
  };
}

type KeyFn = (...args: any[]) => string;

interface BatchDebounceRequest {
  args: any[];
  promise: Promise<any>;
  resolver: (value: any) => any;
  timeout: NodeJS.Timeout;
}

function debounceMemo(
  fn: (...args: any[]) => Promise<any>,
  delay: number
): MemoFn {
  let promise: Promise<any>;
  let resolver: (value: any) => void;
  let timeout: NodeJS.Timeout;

  async function memoized(...args: any[]) {
    clearTimeout(timeout);

    if (!promise) {
      promise = new Promise(resolve => {
        resolver = resolve;
      });
    }

    timeout = setTimeout(async () => {
      const result = await fn(...args);
      resolver(result);
    }, delay);

    return promise;
  }

  memoized.bust = () => {
    promise = undefined;
  };

  return memoized;
}

interface MemoFn {
  (...args: any[]): Promise<any>;
  bust: () => void;
}
