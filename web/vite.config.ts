import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_CARTOMANIA_BASE_URL = 'http://localhost:3053';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	console.log('Loaded VITE_API_BASE_URL:', env.VITE_API_BASE_URL);

	const cartomaniaTarget = (env.VITE_API_BASE_URL?.trim() || DEFAULT_CARTOMANIA_BASE_URL).replace(
		/\/+$/,
		''
	);
	const proxySecure = cartomaniaTarget.startsWith('https://');

	// The localhost HTTPS certs are only used by `vite dev`. They are absent from
	// production builds and from the server (nginx terminates TLS there), so load
	// them only when both files exist — otherwise the build/server would crash.
	const devKeyPath = path.resolve(__dirname, 'certs/localhost-key.pem');
	const devCertPath = path.resolve(__dirname, 'certs/localhost.pem');
	const devHttps =
		fs.existsSync(devKeyPath) && fs.existsSync(devCertPath)
			? {
					key: fs.readFileSync(devKeyPath),
					cert: fs.readFileSync(devCertPath)
				}
			: undefined;

	return {
		plugins: [tailwindcss(), sveltekit()],
		server: {
			host: '0.0.0.0',
			port: 3055,
			...(devHttps ? { https: devHttps } : {}),
			proxy: {
				'/game': {
					target: cartomaniaTarget,
					changeOrigin: true,
					secure: proxySecure
				},
				'/auth': {
					target: cartomaniaTarget,
					changeOrigin: true,
					secure: proxySecure
				},
				'/friends': {
					target: cartomaniaTarget,
					changeOrigin: true,
					secure: proxySecure
				}
			}
		},
		test: {
			projects: [
				{
					extends: './vite.config.ts',
					test: {
						name: 'client',
						environment: 'browser',
						browser: {
							enabled: true,
							provider: 'playwright',
							instances: [{ browser: 'chromium' }]
						},
						include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
						exclude: ['src/lib/server/**'],
						setupFiles: ['./vitest-setup-client.ts']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts}'],
						exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
					}
				}
			]
		}
	};
});
