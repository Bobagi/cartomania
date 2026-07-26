/**
 * Card destruction effects - Burn / Dissolve / Crush.
 *
 * Faithful TypeScript port of the designer's `destruction.jsx` prototype, adapted
 * to our cards (raster art instead of SVG playing cards) and generalised to operate
 * on any `{ card, wrap, canvas }` trio instead of global `.card` selectors.
 *
 * - Burn / Dissolve: an SVG "dissolve shader" (#fx-destroy): fractal-noise turbulence
 *   mixed with a progress map, thresholded so the card is eaten away, with a charred
 *   sliver behind a bright emissive fire/dissolve front, plus canvas ember particles
 *   spawned exactly at the moving front.
 * - Crush: a procedural radial displacement dent (#fx-crush) + a 3D CSS knock-back +
 *   DOM debris (flash, shockwave, dust, shards) from the impact point.
 *
 * Everything is strictly confined to the card element (drop shadows / halos are
 * disabled during the effect - otherwise the SVG filter eats them too). The SVG
 * filters live once in the DOM (see CardFxFilters.svelte); only one card destructs
 * at a time, which is all we need (the loser of a duel round).
 */

export type DestructionType = 'burn' | 'dissolve' | 'crush';

export interface DestructionOptions {
	destructDuration: number; // seconds (burn/dissolve)
	grain: number;
	edgeWidth: number;
	glowAmount: number; // edge blur px
	charDarkness: number;
	burnSpots: number;
	fireColor: string;
	dissolveColor: string;
	particleCount: number;
	crushViolence: number;
	autoReset: boolean;
}

export const DESTRUCTION_DEFAULTS: DestructionOptions = {
	destructDuration: 2.4,
	grain: 0.05,
	edgeWidth: 7,
	glowAmount: 2.5,
	charDarkness: 0.85,
	burnSpots: 3,
	fireColor: '#ffcf7a',
	dissolveColor: '#74e6ff',
	particleCount: 20,
	crushViolence: 1,
	autoReset: false
};

const GREY_MAP =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='8' height='8' fill='%23808080'/%3E%3C/svg%3E";

function hexToRgb(hex: string): [number, number, number] {
	let h = (hex || '#ffffff').replace('#', '');
	if (h.length === 3)
		h = h
			.split('')
			.map((c) => c + c)
			.join('');
	const n = parseInt(h, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	ay: number;
	life: number;
	max: number;
	size: number;
	rgb: [number, number, number];
}

export class CardDestroyer {
	private card: HTMLElement;
	private wrap: HTMLElement;
	private canvas: HTMLCanvasElement;
	private setFrozen: (f: boolean) => void;

	private raf = 0;
	private parts: Particle[] = [];
	private timers: ReturnType<typeof setTimeout>[] = [];
	private ctx: CanvasRenderingContext2D | null = null;
	private type: DestructionType | null = null;
	playing = false;
	private mapGrid: { data: Float32Array; gw: number; gh: number } | null = null;
	private kN = 1;
	private kM = 0;
	private curOff = 99;
	private cw = 0;
	private ch = 0;
	private ox = 0;
	private oy = 0;
	private cardW = 0;
	private cardH = 0;

	constructor(config: {
		card: HTMLElement;
		wrap: HTMLElement;
		canvas: HTMLCanvasElement;
		setFrozen?: (f: boolean) => void;
	}) {
		this.card = config.card;
		this.wrap = config.wrap;
		this.canvas = config.canvas;
		this.setFrozen = config.setFrozen ?? (() => {});
	}

	private _setMatrices(g: number, d: number) {
		const base = '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  60 0 0 0 ';
		const set = (id: string, off: number) => {
			const el = document.getElementById(id);
			if (el) el.setAttribute('values', base + off.toFixed(3));
		};
		set('fx-m0', g);
		set('fx-m1', g - d);
		set('fx-m2', g - 2 * d);
	}

	private _sizeFeImages() {
		const w = this.card.offsetWidth;
		const h = this.card.offsetHeight;
		const el = document.getElementById('fx-map');
		if (el) {
			el.setAttribute('x', '0');
			el.setAttribute('y', '0');
			el.setAttribute('width', String(w));
			el.setAttribute('height', String(h));
		}
		return { w, h };
	}

	private _initCanvas() {
		const r = this.wrap.getBoundingClientRect();
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		this.cw = r.width * 1.8;
		this.ch = r.height * 1.8;
		this.canvas.width = this.cw * dpr;
		this.canvas.height = this.ch * dpr;
		this.ctx = this.canvas.getContext('2d');
		this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
		this.canvas.classList.add('live');
		this.ox = (this.cw - r.width) / 2;
		this.oy = (this.ch - r.height) / 2;
		this.cardW = r.width;
		this.cardH = r.height;
	}

	// BURN progress map: bright = burns last. Edge distance + random hot spots.
	private _genBurnMap(w: number, h: number, spots: number) {
		const sp: { x: number; y: number; r: number; a: number }[] = [];
		for (let i = 0; i < Math.round(spots || 0); i++) {
			sp.push({
				x: 0.18 + 0.64 * Math.random(),
				y: 0.16 + 0.68 * Math.random(),
				r: 0.06 + 0.08 * Math.random(),
				a: 0.5 + 0.4 * Math.random()
			});
		}
		const ar = h / w;
		const val = (nx: number, ny: number) => {
			const e = Math.min(nx, 1 - nx, ny * ar, (1 - ny) * ar) * 2;
			let v = Math.pow(Math.max(0, Math.min(1, e * 1.15)), 0.85);
			for (const s of sp) {
				const dx = nx - s.x;
				const dy = (ny - s.y) * ar;
				v -= s.a * Math.exp(-(dx * dx + dy * dy) / (2 * s.r * s.r));
			}
			return Math.max(0, Math.min(1, v));
		};

		const mw = 96;
		const mh = Math.max(16, Math.round(mw * ar));
		const c = document.createElement('canvas');
		c.width = mw;
		c.height = mh;
		const ctx = c.getContext('2d')!;
		const img = ctx.createImageData(mw, mh);
		for (let y = 0; y < mh; y++) {
			for (let x = 0; x < mw; x++) {
				const b = Math.round(val((x + 0.5) / mw, (y + 0.5) / mh) * 255);
				const i = (y * mw + x) * 4;
				img.data[i] = b;
				img.data[i + 1] = b;
				img.data[i + 2] = b;
				img.data[i + 3] = 255;
			}
		}
		ctx.putImageData(img, 0, 0);

		const gw = 40;
		const gh = Math.max(10, Math.round(gw * ar));
		const grid = new Float32Array(gw * gh);
		for (let y = 0; y < gh; y++)
			for (let x = 0; x < gw; x++) grid[y * gw + x] = val((x + 0.5) / gw, (y + 0.5) / gh);
		this.mapGrid = { data: grid, gw, gh };

		return c.toDataURL();
	}

	// CRUSH displacement map: pixels pulled toward the punch point, with crease spokes
	// and ripple rings. Padded to the whole filter region with neutral grey.
	private _genCrushMap(w: number, h: number) {
		const PAD = 0.35;
		const SPAN = 1 + 2 * PAD;
		const mw = 200;
		const mh = Math.round((mw * h) / w);
		const maxd = 0.68 * w;
		const k = 6 + Math.floor(Math.random() * 5);
		const p1 = Math.random() * 6.283;
		const p2 = Math.random() * 6.283;
		const p3 = Math.random() * 6.283;

		const c = document.createElement('canvas');
		c.width = mw;
		c.height = mh;
		const ctx = c.getContext('2d')!;
		const img = ctx.createImageData(mw, mh);
		for (let y = 0; y < mh; y++) {
			for (let x = 0; x < mw; x++) {
				const nx = (x / mw) * SPAN - PAD;
				const ny = (y / mh) * SPAN - PAD;
				let fx = 0;
				let fy = 0;
				if (nx > -0.02 && nx < 1.02 && ny > -0.02 && ny < 1.02) {
					const dx = (nx - 0.5) * w;
					const dy = (ny - 0.47) * h;
					const d = Math.hypot(dx, dy) || 0.0001;
					const u = d / maxd;
					if (u < 1.7) {
						let f = 3 * u * Math.exp(-2.1 * u);
						const ang = Math.atan2(dy, dx);
						f *= 1 + 0.5 * Math.sin(ang * k + p1) * Math.exp(-u * 0.9);
						f *= 1 + 0.34 * Math.sin(u * 13 + p2);
						const a2 = ang + 0.45 * Math.sin(u * 8 + p3) * Math.exp(-u);
						const ef =
							Math.max(0, Math.min(1, Math.min(nx, 1 - nx) / 0.06)) *
							Math.max(0, Math.min(1, Math.min(ny, 1 - ny) / 0.06));
						f *= 0.3 + 0.7 * ef;
						f = Math.max(-0.98, Math.min(0.98, f));
						fx = Math.cos(a2) * f;
						fy = Math.sin(a2) * f;
					}
				}
				const i = (y * mw + x) * 4;
				img.data[i] = Math.max(0, Math.min(255, 128 + Math.round(120 * fx)));
				img.data[i + 1] = Math.max(0, Math.min(255, 128 + Math.round(120 * fy)));
				img.data[i + 2] = 128;
				img.data[i + 3] = 255;
			}
		}
		ctx.putImageData(img, 0, 0);
		return c.toDataURL();
	}

	private _spawn(p: number, t: DestructionOptions) {
		const cap = t.particleCount;
		if (this.parts.length >= cap) return;
		const burn = this.type === 'burn';
		const rgb = hexToRgb(burn ? t.fireColor : t.dissolveColor);

		if (burn && this.mapGrid) {
			const { data, gw, gh } = this.mapGrid;
			const vF = (0.5 - this.curOff) / 60 / this.kM - (this.kN * 0.5) / this.kM;
			if (vF < -0.06 || vF > 1.08) return;
			const band = 0.07;
			const want = Math.round((cap / 55) * (0.6 + p * 1.2));
			let tries = want * 8;
			let made = 0;
			while (tries-- > 0 && made < want && this.parts.length < cap) {
				const gi = (Math.random() * gw * gh) | 0;
				if (Math.abs(data[gi] - vF) > band) continue;
				const gx = gi % gw;
				const gy = (gi / gw) | 0;
				const x = this.ox + ((gx + Math.random()) / gw) * this.cardW;
				const y = this.oy + ((gy + Math.random()) / gh) * this.cardH;
				const life = 0.55 + Math.random() * 1.0;
				this.parts.push({
					x,
					y,
					vx: (Math.random() - 0.5) * 40,
					vy: -(26 + Math.random() * 72),
					ay: -28,
					life,
					max: life,
					size: 0.9 + Math.random() * 2.6,
					rgb
				});
				made++;
			}
			return;
		}

		const rate = Math.round((cap / 55) * (0.35 + p * 1.3));
		for (let i = 0; i < rate && this.parts.length < cap; i++) {
			const x = this.ox + Math.random() * this.cardW;
			const y = this.oy + Math.random() * this.cardH;
			const cx = this.ox + this.cardW / 2;
			const cy = this.oy + this.cardH / 2;
			const life = 0.8 + Math.random() * 1.1;
			this.parts.push({
				x,
				y,
				vx: (x - cx) * 0.55 + (Math.random() - 0.5) * 30,
				vy: (y - cy) * 0.3 - (18 + Math.random() * 34),
				ay: -8,
				life,
				max: life,
				size: 0.6 + Math.random() * 1.8,
				rgb
			});
		}
	}

	private _draw(dt: number) {
		const ctx = this.ctx;
		if (!ctx) return;
		ctx.clearRect(0, 0, this.cw, this.ch);
		ctx.globalCompositeOperation = 'lighter';
		const next: Particle[] = [];
		for (const p of this.parts) {
			p.life -= dt;
			if (p.life <= 0) continue;
			p.vy += p.ay * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			const k = p.life / p.max;
			const a = Math.min(1, k * 1.4) * (0.6 + Math.random() * 0.4);
			const [r, g, b] = p.rgb;
			const rad = p.size * (0.6 + k * 0.8);
			const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad * 3);
			grd.addColorStop(0, `rgba(255,255,255,${a * 0.9})`);
			grd.addColorStop(0.35, `rgba(${r},${g},${b},${a})`);
			grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
			ctx.fillStyle = grd;
			ctx.beginPath();
			ctx.arc(p.x, p.y, rad * 3, 0, 6.2832);
			ctx.fill();
			next.push(p);
		}
		this.parts = next;
	}

	play(type: DestructionType, t: DestructionOptions) {
		this.reset(true);
		if (!this.card) return;
		this.type = type;
		this.playing = true;

		this.card.classList.add('no-shadow');
		this.wrap.classList.add('destructing');

		if (type === 'crush') return this._crush(t);

		const fine = type === 'dissolve';
		const { w, h } = this._sizeFeImages();

		const mapEl = document.getElementById('fx-map');
		if (fine) {
			this.kN = 1;
			this.kM = 0;
			this.mapGrid = null;
			if (mapEl) mapEl.setAttribute('href', GREY_MAP);
		} else {
			this.kN = 0.3;
			this.kM = 0.7;
			if (mapEl) mapEl.setAttribute('href', this._genBurnMap(w, h, t.burnSpots));
		}
		const mixEl = document.getElementById('fx-mix');
		if (mixEl) {
			mixEl.setAttribute('k2', String(this.kN));
			mixEl.setAttribute('k3', String(this.kM));
		}

		const noise = document.getElementById('fx-noise');
		const freq = t.grain * (fine ? 2.1 : 1.4);
		if (noise) {
			noise.setAttribute('baseFrequency', freq.toFixed(4));
			noise.setAttribute('numOctaves', fine ? '2' : '3');
			noise.setAttribute('seed', String(Math.floor(Math.random() * 100)));
		}
		const hot = document.getElementById('fx-hot');
		if (hot) hot.setAttribute('flood-color', fine ? t.dissolveColor : t.fireColor);
		const charF = document.getElementById('fx-char');
		if (charF) charF.setAttribute('flood-opacity', fine ? '0' : String(t.charDarkness));
		const blur = document.getElementById('fx-blur');
		if (blur) blur.setAttribute('stdDeviation', String(t.glowAmount));

		const d = t.edgeWidth;
		const gStart = 1 + 2 * d;
		const gEnd = -72;
		this._setMatrices(gStart, d);
		this.card.style.filter = 'url(#fx-destroy)';
		this._initCanvas();

		const dur = t.destructDuration * 1000;
		const span = gStart - gEnd;
		let start: number | null = null;
		let last = 0;
		const step = (ts: number) => {
			if (start == null) {
				start = ts;
				last = ts;
			}
			const dt = Math.min(0.05, (ts - last) / 1000);
			last = ts;
			const p = Math.min(1, (ts - start) / dur);
			this.curOff = gStart - p * span;
			this._setMatrices(this.curOff, d);
			this._spawn(p, t);
			this._draw(dt);
			if (p < 1 || this.parts.length) {
				this.raf = requestAnimationFrame(step);
			} else {
				this.playing = false;
				this.canvas.classList.remove('live');
				if (t.autoReset) this.timers.push(setTimeout(() => this.reset(true), 700));
			}
		};
		this.raf = requestAnimationFrame(step);
	}

	private _crush(t: DestructionOptions) {
		this.setFrozen(true);

		this.card.style.setProperty('--prx', this.card.style.getPropertyValue('--rx') || '0deg');
		this.card.style.setProperty('--pry', this.card.style.getPropertyValue('--ry') || '0deg');

		this._sizeFeImages();
		const cw = this.card.offsetWidth;
		const ch = this.card.offsetHeight;
		const cmap = document.getElementById('fx-cmap');
		if (cmap) {
			cmap.setAttribute('x', String(-0.35 * cw));
			cmap.setAttribute('y', String(-0.35 * ch));
			cmap.setAttribute('width', String(1.7 * cw));
			cmap.setAttribute('height', String(1.7 * ch));
			cmap.setAttribute('href', this._genCrushMap(cw, ch));
		}
		const disp = document.getElementById('fx-disp');
		if (disp) disp.setAttribute('scale', '0');
		this.card.style.filter = 'url(#fx-crush)';

		const cv = t.crushViolence;
		const dur = 1100;
		this.card.style.setProperty('--cv', String(cv));
		this.card.style.setProperty('--crush-dur', dur + 'ms');
		this.wrap.style.setProperty('--cv', String(cv));

		const dent = document.createElement('div');
		dent.className = 'cardfx-dent';
		this.card.appendChild(dent);

		void this.card.offsetWidth;
		this.card.classList.add('punched');

		const tImpact = dur * 0.14;
		this.timers.push(
			setTimeout(() => {
				dent.classList.add('on');
				this.wrap.classList.add('shake');
				this._impact(t);
			}, tImpact)
		);

		const maxS = 95 * cv;
		const settle = 0.7;
		let start: number | null = null;
		const step = (ts: number) => {
			if (start == null) start = ts;
			const el = (ts - start) / 1000;
			const tI = tImpact / 1000;
			let S = 0;
			if (el >= tI) {
				const u = el - tI;
				S = maxS * (settle + (1 - settle) * Math.cos(20 * u) * Math.exp(-5.5 * u));
			}
			if (disp) disp.setAttribute('scale', S.toFixed(1));
			if (el < dur / 1000 + 0.8) {
				this.raf = requestAnimationFrame(step);
			} else {
				this.playing = false;
				if (t.autoReset) this.timers.push(setTimeout(() => this.reset(true), 900));
			}
		};
		this.raf = requestAnimationFrame(step);
	}

	private _impact(t: DestructionOptions) {
		const wrap = this.wrap;
		const cv = t.crushViolence;

		const flash = document.createElement('div');
		flash.className = 'cardfx-flash';
		wrap.appendChild(flash);
		void flash.offsetWidth;
		flash.style.transform = `scale(${2.6 * cv})`;
		flash.style.opacity = '0';
		this.timers.push(setTimeout(() => flash.remove(), 600));

		const shock = document.createElement('div');
		shock.className = 'cardfx-shock';
		wrap.appendChild(shock);
		void shock.offsetWidth;
		shock.style.transform = `scale(${3.4 * cv})`;
		shock.style.opacity = '0';
		this.timers.push(setTimeout(() => shock.remove(), 700));

		const dust = document.createElement('div');
		dust.className = 'cardfx-dust';
		wrap.appendChild(dust);
		void dust.offsetWidth;
		dust.style.opacity = '1';
		dust.style.transform = `scale(${1.5 * cv})`;
		this.timers.push(setTimeout(() => (dust.style.opacity = '0'), 380));
		this.timers.push(setTimeout(() => dust.remove(), 1100));

		const n = Math.round(8 + cv * 8);
		for (let i = 0; i < n; i++) {
			const s = document.createElement('div');
			s.className = 'cardfx-shard';
			const w = 6 + Math.random() * 14;
			s.style.width = w + 'px';
			s.style.height = w * (0.7 + Math.random()) + 'px';
			s.style.marginLeft = -w / 2 + 'px';
			wrap.appendChild(s);
			void s.offsetWidth;
			const ang = Math.random() * Math.PI * 2;
			const dist = (70 + Math.random() * 140) * cv;
			const tx = Math.cos(ang) * dist;
			const ty = Math.sin(ang) * dist * 0.8 + 20;
			const rot = (Math.random() - 0.5) * 720;
			s.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${0.4 + Math.random() * 0.6})`;
			s.style.opacity = '0';
			this.timers.push(setTimeout(() => s.remove(), 950));
		}
	}

	reset(hard?: boolean) {
		void hard;
		cancelAnimationFrame(this.raf);
		this.timers.forEach(clearTimeout);
		this.timers = [];
		this.parts = [];
		this.playing = false;
		this.mapGrid = null;
		if (this.ctx) this.ctx.clearRect(0, 0, this.cw, this.ch);
		this.canvas.classList.remove('live');
		const disp = document.getElementById('fx-disp');
		if (disp) disp.setAttribute('scale', '0');
		if (this.card) {
			this.card.style.filter = '';
			this.card.classList.remove('punched', 'no-shadow');
			['--cv', '--crush-dur', '--prx', '--pry'].forEach((p) => this.card.style.removeProperty(p));
			this.card.querySelectorAll('.cardfx-dent').forEach((e) => e.remove());
		}
		if (this.wrap) {
			this.wrap.classList.remove('shake', 'destructing');
			this.wrap.style.removeProperty('--cv');
			this.wrap
				.querySelectorAll('.cardfx-shard, .cardfx-shock, .cardfx-dust, .cardfx-flash')
				.forEach((e) => e.remove());
		}
		this.setFrozen(false);
		this._setMatrices(2, 0);
	}
}
