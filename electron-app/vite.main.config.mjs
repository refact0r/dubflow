import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
	build: {
		outDir: '.vite/build',
		lib: {
			formats: ['es'],
			entry: 'electron/main.js',
			fileName: 'main'
		},
		rollupOptions: {
			external: ['get-windows']
		}
	}
});
