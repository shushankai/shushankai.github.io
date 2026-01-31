import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      'lucide': resolve(__dirname, 'node_modules/lucide/dist/esm/lucide/src/lucide.js'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        blog: resolve(__dirname, 'blog/index.html'),
        blogPost: resolve(__dirname, 'blog/post.html'),
        projects: resolve(__dirname, 'projects/index.html'),
        about: resolve(__dirname, 'about/index.html'),
      },
    },
  },
});
