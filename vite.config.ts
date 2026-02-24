import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';

/** Stub Node.js-only modules that webtorrent marks as false in its browser field */
function stubNodeModules(): Plugin {
  const stubbed = new Set([
    'bittorrent-dht',
    'crypto',
    'fs',
    'http',
    'net',
    'os',
    'load-ip-set',
    'ut_pex',
    '@silentbot1/nat-api',
  ]);

  return {
    name: 'stub-node-modules',
    enforce: 'pre',
    resolveId(source) {
      if (stubbed.has(source)) {
        return { id: `\0stub:${source}`, moduleSideEffects: false };
      }
      return null;
    },
    load(id) {
      if (id.startsWith('\0stub:')) {
        return 'export default {}; export const Client = class {};';
      }
      return null;
    },
  };
}

export default defineConfig({
  root: 'src/client',
  publicDir: resolve(__dirname, 'public'),
  plugins: [stubNodeModules()],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: resolve(__dirname, 'src/client/index.html'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      events: 'events',
      path: 'path-browserify',
    },
  },
  define: {
    'process.env': '{}',
    global: 'globalThis',
  },
});
