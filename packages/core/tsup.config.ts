import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/resolver.ts'],
  format: ['esm'],
  target: 'es2017',
  dts: true,
  clean: true,
  splitting: true,
  treeshake: true,
  sourcemap: true,
  outExtension: () => ({ js: '.js' }),
});
