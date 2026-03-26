import { defineConfig } from 'vite';
import { resolve } from 'path';

// Resolve workspace packages to their source files directly —
// avoids needing a build step in development.
export default defineConfig({
  resolve: {
    alias: {
      '@modernconsent/vendors': resolve(__dirname, '../vendors/src/index.ts'),
      '@modernconsent/core/resolver': resolve(__dirname, '../core/src/resolver.ts'),
      '@modernconsent/core': resolve(__dirname, '../core/src/index.ts'),
      '@modernconsent/widget': resolve(__dirname, '../widget/src/index.ts'),
    },
  },
});
