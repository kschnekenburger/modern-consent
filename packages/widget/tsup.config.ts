import { defineConfig } from 'tsup';

export default defineConfig([
  // ESM — for bundlers (npm install @modernconsent/widget)
  // Core is a peer dep, not bundled.
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    external: ['@modernconsent/core'],
  },

  // CDN bundle — standalone IIFE, core + widget UI only. Zero vendor code.
  // Core no longer has vendor side effects, so no alias hack is needed.
  {
    entry: { 'mc-widget': 'src/cdn.ts' },
    format: ['iife'],
    globalName: 'ModernConsent',
    sourcemap: true,
    outExtension: () => ({ js: '.js' }),
    minify: true,
  },
]);
