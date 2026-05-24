import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');

const shared = {
  bundle: true,
  minify: production,
  sourcemap: !production,
};

// Main process: Node CJS, mark electron as external (provided by Electron runtime)
await esbuild.build({
  ...shared,
  entryPoints: ['src/main.ts'],
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/main.js',
  external: ['electron'],
});

// Preload: Node CJS with electron APIs, external so Electron provides them
await esbuild.build({
  ...shared,
  entryPoints: ['src/preload.ts'],
  platform: 'node',
  format: 'cjs',
  outfile: 'dist/preload.js',
  external: ['electron'],
});

// Renderer: browser IIFE, no electron
await esbuild.build({
  ...shared,
  entryPoints: ['renderer/main.ts'],
  platform: 'browser',
  format: 'iife',
  outfile: 'dist/renderer.js',
});

console.log('PECS Desktop build complete');
