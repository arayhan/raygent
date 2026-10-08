import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  // GitHub Pages serves the project site under /raygent/.
  base: '/raygent/',
  plugins: [react(), tailwindcss()],
  build: {
    // Outside package.json "files", so the site never ships with the CLI.
    outDir: path.resolve(here, '..', 'dist-site'),
    emptyOutDir: true,
  },
});
