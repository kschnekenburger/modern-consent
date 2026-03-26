import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/resolver.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: true,
  treeshake: true,
  sourcemap: true,
  outExtension: () => ({ js: '.js' }),
});
