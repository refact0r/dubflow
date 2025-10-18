import adapter from '@sveltejs/adapter-static'

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			pages: '.vite/renderer/main_window',
		}),
		router: {
			type: 'hash',
		},
	},
}

export default config
