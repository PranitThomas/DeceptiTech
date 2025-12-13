import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/main.jsx')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      },
      external: (id) => {
        // Externalize problematic modules
        if (id.includes('define-globalThis-property') || 
            id.includes('internals/') ||
            id.includes('core-js/')) {
          return true;
        }
        return false;
      }
    }
  },
  define: {
    global: 'globalThis'
  },
  optimizeDeps: {
    exclude: ['define-globalThis-property']
  }
});
