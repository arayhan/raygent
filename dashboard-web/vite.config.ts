import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  build: {
    outDir: path.resolve(here, '..', 'dist-web'),
    emptyOutDir: true,
  },
  server: {
    // dev server proxies API calls to a running `raygent dashboard`
    proxy: { '/api': 'http://localhost:4321' },
  },
});
