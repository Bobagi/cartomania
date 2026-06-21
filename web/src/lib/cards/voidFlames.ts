/**
 * Void Flames — an ambient particle effect for the duel arena.
 *
 * Dark, smoky "flame tongues" emanate OUTWARD from each played card's art into the empty
 * space of the circular battlefield, like the black/void flames in games such as
 * Hearthstone. Each flame's colour is sampled from the art's EDGE at the point it
 * emanates from, so the flames bleed the card's own border colours.
 *
 * Same family as the card destruction FX (`cardDestruction.ts`): a requestAnimationFrame
 * loop driving a <canvas> particle system — ambient/continuous, confined to the disc, and
 * it NEVER touches the art's pixels/edges.
 *
 * The engine self-discovers emitters each frame by querying `.lb__arena-art` inside the
 * root element, so the Svelte side just creates it once and calls start()/stop().
 *
 * Colour sampling reads the image pixels on a tiny <canvas>; the card-image host sends CORS
 * (so it isn't tainted), and we fetch a cache-busted copy with crossorigin to dodge the
 * classic "already cached without CORS → tainted" bug. Falls back to a neutral tone while
 * the sample loads / if it ever fails.
 */

export type RGB = [number, number, number];

const FALLBACK: RGB = [88, 78, 110];

// ---- per-art edge-colour grid (sampled once per src) -----------------------
interface Grid {
	data: Uint8ClampedArray;
	w: number;
	h: number;
}
const gridCache = new Map<string, Grid | null>();
const gridPending = new Set<string>();

function ensureGrid(src: string): void {
	if (!src || gridCache.has(src) || gridPending.has(src)) return;
	gridPending.add(src);
	const img = new Image();
	img.crossOrigin = 'anonymous';
	img.onload = () => {
		try {
			const n = 48;
			const c = document.createElement('canvas');
			c.width = n;
			c.height = n;
			const ctx = c.getContext('2d');
			if (!ctx) throw new Error('no 2d');
			ctx.drawImage(img, 0, 0, n, n);
			gridCache.set(src, { data: ctx.getImageData(0, 0, n, n).data, w: n, h: n });
		} catch {
			gridCache.set(src, null);
		} finally {
			gridPending.delete(src);
		}
	};
	img.onerror = () => {
		gridCache.set(src, null);
		gridPending.delete(src);
	};
	// cache-buster so the crossorigin request can't reuse a non-CORS cached copy
	img.src = src + (src.includes('?') ? '&' : '?') + 'fx=1';
}

// Colour at a normalized (0..1) point of the art, brightened a touch so the flame reads.
function colorAt(grid: Grid, nx: number, ny: number): RGB {
	const x = Math.max(0, Math.min(grid.w - 1, (nx * grid.w) | 0));
	const y = Math.max(0, Math.min(grid.h - 1, (ny * grid.h) | 0));
	const i = (y * grid.w + x) * 4;
	return [grid.data[i], grid.data[i + 1], grid.data[i + 2]];
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
	buoy: number;
}

interface Emitter {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	src: string;
	buoyDir: number; // +1 = drift DOWN (opponent, top → toward the player), -1 = UP
}

const MAX_PARTICLES = 560;
const RATE_PER_EMITTER = 96; // particles/sec — dense enough to fill a half

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
		const midY = canvasRect.height / 2;
		arts.forEach((el) => {
			const b = el.getBoundingClientRect();
			if (b.width < 4) return;
			const src = el.currentSrc || el.src;
			ensureGrid(src);
			const cy = b.top - canvasRect.top + b.height / 2;
			out.push({
				cx: b.left - canvasRect.left + b.width / 2,
				cy,
				rx: b.width / 2,
				ry: b.height / 2,
				src,
				buoyDir: cy < midY ? 1 : -1
			});
		});
		return out;
	}

	private spawn(em: Emitter): void {
		if (this.parts.length >= MAX_PARTICLES) return;
		const a = Math.random() * Math.PI * 2;
		// spawn just inside the art's perimeter and push OUTWARD into the empty space
		const px = em.cx + Math.cos(a) * em.rx * 0.92;
		const py = em.cy + Math.sin(a) * em.ry * 0.92;
		// colour = the art's edge colour where the flame leaves the card
		const grid = gridCache.get(em.src);
		const rgb: RGB = grid
			? colorAt(grid, 0.5 + Math.cos(a) * 0.46, 0.5 + Math.sin(a) * 0.46)
			: FALLBACK;
		const speed = 30 + Math.random() * 80;
		const life = 1.7 + Math.random() * 2.7;
		const buoy = em.buoyDir * (26 + Math.random() * 22);
		this.parts.push({
			x: px,
			y: py,
			vx: Math.cos(a) * speed,
			vy: Math.sin(a) * speed + buoy * 0.4,
			life,
			max: life,
			size: 12 + Math.random() * 20,
			rgb,
			seed: Math.random() * 1000,
			buoy
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
		this.acc += dt;
		const step = 1 / RATE_PER_EMITTER;
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
			const curl = Math.sin(p.seed + t * 3.4) * 38;
			const a0 = Math.atan2(p.vy, p.vx);
			p.vx += Math.cos(a0 + Math.PI / 2) * curl * dt;
			p.vy += Math.sin(a0 + Math.PI / 2) * curl * dt + p.buoy * dt; // buoyancy (per side)
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.vx *= 0.985;
			p.vy *= 0.99;
			const k = p.life / p.max; // 1 → 0
			// dark, colour-tinted flare; stretched along motion into a tongue
			const alpha = Math.min(1, k * 1.9) * 0.24;
			const rad = p.size * (0.7 + (1 - k) * 2.2);
			const speed = Math.hypot(p.vx, p.vy);
			const elong = 1 + Math.min(3.6, speed / 30);
			const [r, g, b] = p.rgb;
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(a0);
			ctx.scale(elong, 1);
			const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, rad);
			grd.addColorStop(0, `rgba(${(r * 0.82) | 0},${(g * 0.76) | 0},${(b * 0.9) | 0},${alpha})`);
			grd.addColorStop(
				0.5,
				`rgba(${(r * 0.34) | 0},${(g * 0.3) | 0},${(b * 0.44) | 0},${alpha * 0.45})`
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
