/**
 * Void Flames — an ambient particle effect for the duel arena.
 *
 * Dark, smoky "flame tongues" emanate OUTWARD from each played card's art into the
 * empty space of the circular battlefield, like the black/void flames in games such as
 * Hearthstone. The flame COLOURS are sampled from the card's own art (a tiny offscreen
 * <canvas> read of the image — needs CORS, which the card-image host now sends), so the
 * flames always match the creature.
 *
 * Same family as the card destruction FX (`cardDestruction.ts`): a requestAnimationFrame
 * loop driving a <canvas> particle system. Here it's ambient/continuous and confined to
 * the disc, and it NEVER touches the art's pixels/edges — it only fills the empty space.
 *
 * The engine self-discovers emitters each frame by querying `.lb__arena-art` inside the
 * root element, so the Svelte side just creates it once and calls start()/stop().
 */

export type RGB = [number, number, number];

const FALLBACK_PALETTE: RGB[] = [
	[150, 70, 210],
	[95, 45, 165],
	[200, 110, 235]
];

// ---- palette sampling (cached by image src) --------------------------------
const paletteCache = new Map<string, RGB[]>();
const palettePending = new Set<string>();

function getPalette(src: string): RGB[] {
	return paletteCache.get(src) ?? FALLBACK_PALETTE;
}

function ensurePalette(src: string): void {
	if (!src || paletteCache.has(src) || palettePending.has(src)) return;
	palettePending.add(src);
	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.onload = () => {
		try {
			const n = 14;
			const c = document.createElement('canvas');
			c.width = n;
			c.height = n;
			const ctx = c.getContext('2d');
			if (!ctx) throw new Error('no 2d');
			ctx.drawImage(img, 0, 0, n, n);
			const { data } = ctx.getImageData(0, 0, n, n);
			paletteCache.set(src, extractPalette(data));
		} catch {
			paletteCache.set(src, FALLBACK_PALETTE);
		} finally {
			palettePending.delete(src);
		}
	};
	img.onerror = () => {
		paletteCache.set(src, FALLBACK_PALETTE);
		palettePending.delete(src);
	};
	img.src = src;
}

// Pick the most vivid (saturated, mid-bright) colours, bucketed so we get variety.
function extractPalette(data: Uint8ClampedArray): RGB[] {
	const buckets = new Map<string, { r: number; g: number; b: number; n: number; score: number }>();
	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		if (data[i + 3] < 40) continue;
		const mx = Math.max(r, g, b);
		const mn = Math.min(r, g, b);
		const sat = mx === 0 ? 0 : (mx - mn) / mx;
		const lum = (r + g + b) / 3;
		if (lum < 24 || lum > 236) continue;
		const score = sat * (1 - Math.abs(lum - 155) / 165);
		const key = `${r >> 5}-${g >> 5}-${b >> 5}`;
		const cur = buckets.get(key);
		if (cur) {
			cur.r += r;
			cur.g += g;
			cur.b += b;
			cur.n++;
			cur.score += score;
		} else {
			buckets.set(key, { r, g, b, n: 1, score });
		}
	}
	const arr = [...buckets.values()]
		.map((v) => ({
			rgb: [Math.round(v.r / v.n), Math.round(v.g / v.n), Math.round(v.b / v.n)] as RGB,
			score: v.score
		}))
		.sort((a, b) => b.score - a.score);
	const pal = arr.slice(0, 5).map((x) => x.rgb);
	return pal.length ? pal : FALLBACK_PALETTE;
}

// ---- particle engine -------------------------------------------------------
interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	rgb: RGB;
	seed: number;
}

interface Emitter {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	pal: RGB[];
}

const MAX_PARTICLES = 320;

export class VoidFlames {
	private canvas: HTMLCanvasElement;
	private root: HTMLElement;
	private ctx: CanvasRenderingContext2D | null;
	private parts: Particle[] = [];
	private raf = 0;
	private last = 0;
	private acc = 0;
	private dpr = 1;
	private running = false;
	private cw = 0;
	private ch = 0;

	constructor(canvas: HTMLCanvasElement, root: HTMLElement) {
		this.canvas = canvas;
		this.root = root;
		this.ctx = canvas.getContext('2d');
	}

	start(): void {
		if (this.running || !this.ctx) return;
		this.running = true;
		this.last = performance.now();
		this.raf = requestAnimationFrame(this.tick);
	}

	stop(): void {
		this.running = false;
		cancelAnimationFrame(this.raf);
		this.parts = [];
		if (this.ctx) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	}

	private resize(): DOMRect {
		const r = this.canvas.getBoundingClientRect();
		this.dpr = Math.min(2, window.devicePixelRatio || 1);
		const w = Math.round(r.width);
		const h = Math.round(r.height);
		if (w !== this.cw || h !== this.ch) {
			this.cw = w;
			this.ch = h;
			this.canvas.width = Math.max(1, w * this.dpr);
			this.canvas.height = Math.max(1, h * this.dpr);
		}
		return r;
	}

	private emitters(canvasRect: DOMRect): Emitter[] {
		const arts = this.root.querySelectorAll<HTMLImageElement>('.lb__arena-art');
		const out: Emitter[] = [];
		arts.forEach((el) => {
			const b = el.getBoundingClientRect();
			if (b.width < 4) return;
			const src = el.currentSrc || el.src;
			ensurePalette(src);
			out.push({
				cx: b.left - canvasRect.left + b.width / 2,
				cy: b.top - canvasRect.top + b.height / 2,
				rx: b.width / 2,
				ry: b.height / 2,
				pal: getPalette(src)
			});
		});
		return out;
	}

	private spawn(em: Emitter): void {
		if (this.parts.length >= MAX_PARTICLES) return;
		// Bias spawns toward the art's SIDES (where the empty space is), so the flames lick
		// out into the void rather than over the seam/rim. Push OUTWARD with a gentle rise.
		const a = Math.atan2(
			Math.sin(Math.random() * Math.PI * 2) * 0.55,
			Math.cos(Math.random() * Math.PI * 2)
		);
		const px = em.cx + Math.cos(a) * em.rx * 0.9;
		const py = em.cy + Math.sin(a) * em.ry * 0.9;
		const speed = 26 + Math.random() * 62;
		const rgb = em.pal[(Math.random() * em.pal.length) | 0] ?? FALLBACK_PALETTE[0];
		const life = 1.3 + Math.random() * 2.1;
		this.parts.push({
			x: px,
			y: py,
			vx: Math.cos(a) * speed,
			vy: Math.sin(a) * speed - (8 + Math.random() * 16),
			life,
			max: life,
			size: 7 + Math.random() * 15,
			rgb,
			seed: Math.random() * 1000
		});
	}

	private tick = (ts: number): void => {
		if (!this.running || !this.ctx) return;
		const dt = Math.min(0.05, (ts - this.last) / 1000);
		this.last = ts;
		const cr = this.resize();
		const ctx = this.ctx;
		ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
		ctx.clearRect(0, 0, this.cw, this.ch);

		const ems = this.emitters(cr);
		const ratePerEmitter = 48;
		this.acc += dt;
		const step = 1 / ratePerEmitter;
		while (this.acc > step) {
			this.acc -= step;
			for (const em of ems) this.spawn(em);
		}

		ctx.globalCompositeOperation = 'lighter';
		const next: Particle[] = [];
		for (const p of this.parts) {
			p.life -= dt;
			if (p.life <= 0) continue;
			const t = p.max - p.life;
			// curl perpendicular to motion → wavy, tentacle-like tongues
			const curl = Math.sin(p.seed + t * 3.4) * 36;
			const a0 = Math.atan2(p.vy, p.vx);
			p.vx += Math.cos(a0 + Math.PI / 2) * curl * dt;
			p.vy += Math.sin(a0 + Math.PI / 2) * curl * dt - 22 * dt; // gentle buoyancy
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= 0.985;
			p.vy *= 0.99;
			const k = p.life / p.max; // 1 → 0
			// Dark flame: low alpha + dimmed colours → a dark, colour-tinted flare (not bright
			// fire). Each particle is stretched along its motion into a tongue.
			const alpha = Math.min(1, k * 1.9) * 0.26;
			const rad = p.size * (0.7 + (1 - k) * 2.1);
			const speed = Math.hypot(p.vx, p.vy);
			const elong = 1 + Math.min(3.6, speed / 30); // faster → longer tongue
			const [r, g, b] = p.rgb;
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(a0);
			ctx.scale(elong, 1);
			const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
			grd.addColorStop(0, `rgba(${(r * 0.72) | 0},${(g * 0.66) | 0},${(b * 0.8) | 0},${alpha})`);
			grd.addColorStop(
				0.5,
				`rgba(${(r * 0.3) | 0},${(g * 0.26) | 0},${(b * 0.4) | 0},${alpha * 0.42})`
			);
			grd.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = grd;
			ctx.beginPath();
			ctx.arc(0, 0, rad, 0, 6.2832);
			ctx.fill();
			ctx.restore();
			next.push(p);
		}
		this.parts = next;
		this.raf = requestAnimationFrame(this.tick);
	};
}
