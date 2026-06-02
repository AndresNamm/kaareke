import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures assets are loaded relatively
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
