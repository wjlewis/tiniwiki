import compose from './compose';

function main(): Promise<void> {
  const args = process.argv;

  if (args.length !== 3) {
    console.error(`usage: tiniwiki <dir>`);
    process.exit(1);
  }

  const dirpath = args[2];
  return compose(dirpath);
}

main();
