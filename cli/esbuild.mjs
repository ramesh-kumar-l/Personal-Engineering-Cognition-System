import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'dist/index.js',
  platform: 'node',
  format: 'cjs',
  minify: production,
  sourcemap: !production,
  banner: { js: '#!/usr/bin/env node' },
  external: ['commander'], // keep commander unbundled; install via npm
});

console.log('PECS CLI build complete');
