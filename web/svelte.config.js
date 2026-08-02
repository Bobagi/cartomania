import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// Content-Security-Policy. `mode: 'auto'` makes SvelteKit hash/nonce its own
		// inline hydration scripts, so the policy can stay strict without unsafe-inline
		// for scripts. Styles keep `unsafe-inline` (and style-src-attr) because the card
		// and duel UI set many CSS custom properties via inline style attributes.
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				// Umami analytics (analytics.bobagi.space) is only injected after consent,
				// but it must be allow-listed for the runtime injection to work.
				'script-src': ['self', 'https://analytics.bobagi.space'],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'style-src-attr': ['unsafe-inline'],
				'img-src': ['self', 'data:', 'https://bobagi.space', 'https://*.googleusercontent.com'],
				// Google Fonts stylesheet (googleapis) pulls the actual font files from
				// gstatic; self-hosting these would let us drop both hosts (privacy).
				'font-src': ['self', 'data:', 'https://fonts.gstatic.com'],
				'connect-src': ['self', 'https://analytics.bobagi.space'],
				'frame-ancestors': ['none'],
				'form-action': ['self'],
				'base-uri': ['self'],
				'object-src': ['none']
			}
		}
	}
};

export default config;
