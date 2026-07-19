import type { RequestHandler } from './$types';

const BASE = 'https://cartomania.bobagi.space';

/**
 * Servido por rota (e não por static/robots.txt) de propósito: o .gitignore do
 * repo tem um `*.txt` genérico, então um arquivo estático não seria versionado
 * e sumiria num clone limpo. Como rota, é código — sobrevive ao deploy.
 */
export const prerender = false;

export const GET: RequestHandler = async () =>
	new Response(
		`User-agent: *\nAllow: /\n`
			+ `# área logada e partidas efêmeras — nada a indexar\n`
			+ `Disallow: /account\nDisallow: /game/\nDisallow: /api/\n\n`
			+ `Sitemap: ${BASE}/sitemap.xml\n`,
		{ headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
	);
