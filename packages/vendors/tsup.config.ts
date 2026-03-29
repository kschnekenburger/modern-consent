import { defineConfig } from 'tsup';

export default defineConfig([
  // Library entry — useBuiltinVendors()
  {
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    target: 'es2017',
    dts: true,
    clean: true,
    treeshake: true,
    sourcemap: true,
    external: ['@modernconsent/core'],
    outExtension: () => ({ js: '.js' }),
  },
  // Vendors — standalone, zero external deps, hostable on any CDN
  {
    entry: [
      // Analytics
      'src/google-analytics.ts',
      'src/matomo.ts',
      'src/clarity.ts',
      'src/hotjar.ts',
      'src/hubspot.ts',
      'src/amplitude.ts',
      'src/piano-analytics.ts',
      'src/posthog.ts',
      'src/sentry.ts',
      'src/abtasty.ts',
      'src/gtm.ts',
      'src/segment.ts',
      'src/plausible.ts',
      // Advertising
      'src/googleads.ts',
      'src/gcmads.ts',
      'src/meta-pixel.ts',
      'src/linkedin-insight.ts',
      'src/tiktok-pixel.ts',
      'src/criteo.ts',
      'src/pinterest-pixel.ts',
      'src/snapchat-pixel.ts',
      'src/reddit-pixel.ts',
      // Support
      'src/intercom.ts',
      'src/smartsupp.ts',
    ],
    outDir: 'dist',
    format: ['esm'],
    target: 'es2017',
    dts: true,
    splitting: false,
    treeshake: true,
    sourcemap: true,
    outExtension: () => ({ js: '.js' }),
  },
]);
