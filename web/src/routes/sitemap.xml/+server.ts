import type { RequestHandler } from './$types';

const BASE = 'https://cartomania.bobagi.space';

/**
 * Páginas públicas do Cartomania.
 *
 * Ficam DE FORA de propósito:
 *  - /account  → redireciona (302) para a home sem sessão; nada a indexar.
 *  - /game/classic/[id] e /game/duel/[id] → partidas são efêmeras e por usuário;
 *    indexá-las geraria milhares de URLs mortas na busca.
 */
const PAGES: { path: string; priority: string; changefreq: string }[] = [
	{ path: '/', priority: '1.0', changefreq: 'weekly' },
	{ path: '/gallery', priority: '0.9', changefreq: 'weekly' },
	{ path: '/cards-lab', priority: '0.8', changefreq: 'weekly' },
	{ path: '/register', priority: '0.5', changefreq: 'monthly' },
	{ path: '/privacy', priority: '0.3', changefreq: 'yearly' },
	{ path: '/terms', priority: '0.3', changefreq: 'yearly' }
];

export const prerender = false;

export const GET: RequestHandler = async () => {
	const lastmod = new Date().toISOString().slice(0, 10);
	const urls = PAGES.map(
		(p) =>
			`  <url>\n    <loc>${BASE}${p.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n` +
			`    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
	).join('\n');

	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n` +
			`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
		{ headers: { 'Content-Type': 'application/xml; charset=utf-8' } }
	);
};
