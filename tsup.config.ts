import { defineConfig } from 'tsup';

const external = ['@inquirer/prompts', 'chalk', 'commander', 'cosmiconfig', 'inquirer', 'simple-git'];

export default defineConfig([
  {
    clean: true,
    entry: {
      index: 'src/index.ts',
    },
    external,
    format: ['esm'],
    minify: false,
    outDir: 'dist/esm',
    outExtension: () => ({ js: '.js' }),
    platform: 'node',
    sourcemap: true,
    splitting: false,
    target: 'node18',
    tsconfig: 'tsconfig.src.json',
  },
  {
    clean: false,
    entry: {
      index: 'src/index.ts',
    },
    external,
    format: ['cjs'],
    minify: false,
    outDir: 'dist/cjs',
    platform: 'node',
    sourcemap: true,
    splitting: false,
    target: 'node18',
    tsconfig: 'tsconfig.src.json',
  },
  {
    clean: false,
    entry: {
      cli: 'src/cli.ts',
    },
    external,
    format: ['cjs'],
    minify: false,
    outDir: 'dist/cjs',
    platform: 'node',
    sourcemap: true,
    splitting: false,
    target: 'node18',
    tsconfig: 'tsconfig.src.json',
  },
]);
