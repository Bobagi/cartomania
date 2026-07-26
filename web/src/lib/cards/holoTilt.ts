/**
 * Holographic tilt loop - port of the designer's iridescent-card rAF loop.
 * Tracks the pointer over a scene element and drives CSS custom properties on the
 * card (`--rx/--ry/--lift/--mx/--my/--irid-x/--irid-y/--irid-angle/--sheen-pos/
 * --hover`) so the foil layers (.cardfx-foil / .cardfx-glow in cardFx.css) shift and
 * shimmer with movement. Has an idle sway when not hovered, and can be frozen (the
 * Crush effect freezes the tilt so its knock-back keyframes own the transform).
 */

export interface HoloTiltOptions {
	maxTilt: number;
	smoothing: number;
	liftZ: number;
	iridShift: number;
	idleSway: boolean;
	idleSpeed: number;
}

export const HOLO_TILT_DEFAULTS: HoloTiltOptions = {
	maxTilt: 16,
	smoothing: 0.12,
	liftZ: 24,
	iridShift: 26,
	idleSway: false,
	idleSpeed: 0.6
};

export interface HoloTiltController {
	destroy(): void;
	setFrozen(frozen: boolean): void;
}

export function createHoloTilt(
	card: HTMLElement,
	scene: HTMLElement,
	getOptions: () => HoloTiltOptions
): HoloTiltController {
	const s = {
		rx: 0,
		ry: 0,
		mx: 50,
		my: 50,
		hv: 0,
		tx: 0,
		ty: 0,
		tmx: 50,
		tmy: 50,
		hover: false,
		time: 0,
		raf: 0,
		frozen: false
	};

	const onMove = (e: PointerEvent) => {
		const r = card.getBoundingClientRect();
		const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
		const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
		s.tx = Math.max(-1.4, Math.min(1.4, dx));
		s.ty = Math.max(-1.4, Math.min(1.4, dy));
		s.tmx = ((e.clientX - r.left) / r.width) * 100;
		s.tmy = ((e.clientY - r.top) / r.height) * 100;
		s.hover = true;
	};
	const onLeave = () => {
		s.hover = false;
	};
	scene.addEventListener('pointermove', onMove);
	scene.addEventListener('pointerleave', onLeave);

	const loop = () => {
		const tw = getOptions();
		s.time += 1 / 60;
		let gx: number, gy: number, gmx: number, gmy: number, hAmt: number;
		if (s.hover) {
			gx = s.tx;
			gy = s.ty;
			gmx = s.tmx;
			gmy = s.tmy;
			hAmt = 1;
		} else if (tw.idleSway) {
			const a = s.time * tw.idleSpeed;
			gx = Math.sin(a) * 0.55;
			gy = Math.cos(a * 0.8) * 0.42;
			gmx = 50 + Math.sin(a) * 30;
			gmy = 50 + Math.cos(a * 0.8) * 26;
			hAmt = 0.5;
		} else {
			gx = 0;
			gy = 0;
			gmx = 50;
			gmy = 50;
			hAmt = 0;
		}
		const k = tw.smoothing;
		s.rx += (gx - s.rx) * k;
		s.ry += (gy - s.ry) * k;
		s.mx += (gmx - s.mx) * k;
		s.my += (gmy - s.my) * k;
		s.hv += (hAmt - s.hv) * k;

		if (!s.frozen) {
			const set = (n: string, v: string) => card.style.setProperty(n, v);
			set('--rx', (-s.ry * tw.maxTilt).toFixed(2) + 'deg');
			set('--ry', (s.rx * tw.maxTilt).toFixed(2) + 'deg');
			set('--lift', (s.hv * tw.liftZ).toFixed(1) + 'px');
			set('--mx', s.mx.toFixed(2) + '%');
			set('--my', s.my.toFixed(2) + '%');
			set('--irid-x', (50 + s.rx * tw.iridShift + (s.mx - 50) * 0.32).toFixed(1) + '%');
			set('--irid-y', (50 + s.ry * tw.iridShift + (s.my - 50) * 0.32).toFixed(1) + '%');
			set('--irid-angle', (115 + s.rx * 42).toFixed(1) + 'deg');
			set('--sheen-pos', (50 + s.rx * 65).toFixed(1) + '% ' + (50 + s.ry * 65).toFixed(1) + '%');
			set('--hover', s.hv.toFixed(3));
		}
		s.raf = requestAnimationFrame(loop);
	};
	s.raf = requestAnimationFrame(loop);

	return {
		destroy() {
			cancelAnimationFrame(s.raf);
			scene.removeEventListener('pointermove', onMove);
			scene.removeEventListener('pointerleave', onLeave);
		},
		setFrozen(frozen: boolean) {
			s.frozen = frozen;
		}
	};
}

/** The iridescent palette gradients (monochrome-friendly foil looks). */
export const FOIL_PALETTES: Record<string, string> = {
	oilslick:
		'hsl(350 85% 64%), hsl(40 92% 62%), hsl(150 70% 55%), hsl(190 88% 60%), hsl(265 78% 64%), hsl(330 85% 64%), hsl(350 85% 64%)',
	aurora:
		'hsl(155 82% 56%), hsl(185 88% 60%), hsl(225 72% 64%), hsl(285 70% 66%), hsl(155 82% 56%)',
	pearl: 'hsl(330 62% 80%), hsl(48 72% 82%), hsl(168 52% 78%), hsl(210 64% 82%), hsl(330 62% 80%)',
	goldteal: 'hsl(45 92% 62%), hsl(172 72% 52%), hsl(200 82% 58%), hsl(45 92% 62%)',
	spectrum:
		'hsl(0 88% 62%), hsl(60 88% 60%), hsl(120 70% 52%), hsl(180 82% 56%), hsl(240 74% 64%), hsl(300 80% 64%), hsl(360 88% 62%)'
};

export interface FoilOptions {
	palette: keyof typeof FOIL_PALETTES | string;
	iridIntensity: number;
	iridSat: number;
	iridBright: number;
	iridScale: number;
	iridBlend: string;
	sheenIntensity: number;
	specIntensity: number;
	specSize: number;
	glowIntensity: number;
	glowBlur: number;
}

export const FOIL_DEFAULTS: FoilOptions = {
	palette: 'oilslick',
	iridIntensity: 0.55,
	iridSat: 1.2,
	iridBright: 1,
	iridScale: 200,
	iridBlend: 'color-dodge',
	sheenIntensity: 0.32,
	specIntensity: 0.4,
	specSize: 240,
	glowIntensity: 0.5,
	glowBlur: 60
};

/** Build the CSS custom properties that configure the foil look (palette/intensity). */
export function foilStyleVars(f: FoilOptions): string {
	const grad = `linear-gradient(var(--irid-angle, 118deg), ${FOIL_PALETTES[f.palette] || FOIL_PALETTES.oilslick})`;
	return [
		`--irid-grad:${grad}`,
		`--irid-op:${f.iridIntensity}`,
		`--irid-sat:${f.iridSat}`,
		`--irid-bright:${f.iridBright}`,
		`--irid-scale:${f.iridScale}%`,
		`--irid-blend:${f.iridBlend}`,
		`--sheen-int:${f.sheenIntensity}`,
		`--spec-int:${f.specIntensity}`,
		`--spec-size:${f.specSize}px`,
		`--glow-int:${f.glowIntensity}`,
		`--glow-blur:${f.glowBlur}px`
	].join(';');
}
