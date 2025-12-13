import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Ensure deterministic filenames so manifest can reference them
export default defineConfig({
	plugins: [react()],
	build: {
		rollupOptions: {
			input: {
				main: path.resolve(__dirname, 'index.html'),
				contentScript: path.resolve(__dirname, 'src/contentScript.js'),
			},
			output: {
				entryFileNames: (chunk) => {
					if (chunk.name === 'contentScript') return 'assets/contentScript.js';
					if (chunk.name === 'main') return 'assets/main.js';
					return 'assets/[name].js';
				},
				chunkFileNames: 'assets/[name].js',
				assetFileNames: 'assets/[name][extname]',
			},
		},
	},
});
