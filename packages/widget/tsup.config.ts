import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { consent: 'src/index.ts' },
  format: ['iife'],
  globalName: 'ModernConsent',
  target: 'es2017',
  sourcemap: true,
  clean: true,
  outExtension: () => ({ js: '.js' }),
  minify: true,
});
