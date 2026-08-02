// PM2 config for the SvelteKit (adapter-node) frontend.
//
// adapter-node does NOT load a .env at runtime, and `$env/dynamic/private`
// (e.g. GOOGLE_CLIENT_ID / GOOGLE_REDIRECT_URI for Google sign-in) is read from
// process.env at runtime - so we load web/.env here and inject it. The Google
// CLIENT SECRET is NOT in web/.env (only the backend needs it); the client id +
// redirect uri + PUBLIC_GOOGLE_AUTH_ENABLED are not secret.
const fs = require('fs');
const path = require('path');

function loadDotEnv(file) {
	const out = {};
	try {
		for (const rawLine of fs.readFileSync(file, 'utf8').split('\n')) {
			const line = rawLine.trim();
			if (!line || line.startsWith('#')) continue;
			const eq = line.indexOf('=');
			if (eq === -1) continue;
			out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
		}
	} catch {
		// no .env - run with defaults (feature stays off)
	}
	return out;
}

const fileEnv = loadDotEnv(path.join(__dirname, '.env'));

module.exports = {
	apps: [
		{
			name: 'cartomania-web',
			script: 'build/index.js',
			env: {
				NODE_ENV: 'production',
				HOST: '127.0.0.1',
				PORT: 3055,
				...fileEnv
			}
		}
	]
};
