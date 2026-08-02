/**
 * Attribute-themed "defeat" animation for a duel card.
 *
 * Renders a self-contained canvas particle system (fire / magic / might) over
 * the losing card element and dissolves it. Pure DOM/canvas - no app state.
 * Extracted from the duel page to keep that component focused on orchestration.
 */

type FireDefeatParticle = {
	type: 'fire';
	px: number;
	py: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	flickerSpeed: number;
};

type MagicDefeatParticle = {
	type: 'magic';
	angle: number;
	radius: number;
	angularVelocity: number;
	radiusVelocity: number;
	px: number;
	py: number;
	life: number;
	maxLife: number;
	size: number;
};

type MightDefeatParticle = {
	type: 'might';
	px: number;
	py: number;
	vx: number;
	vy: number;
	rotation: number;
	rotationVelocity: number;
	life: number;
	maxLife: number;
	width: number;
	height: number;
	notchOffsetLeft: number;
	notchOffsetRight: number;
	fractureDepth: number;
	baseAlpha: number;
};

type DefeatParticle = FireDefeatParticle | MagicDefeatParticle | MightDefeatParticle;

export function startAttributeThemedDefeatAnimation(
	targetEl: HTMLElement,
	mode: 'fire' | 'magic' | 'might',
	durationMs: number = 2200
) {
	if (!targetEl || targetEl.dataset.defeatEffectActive === '1') {
		return;
	}
	const boundingRect = targetEl.getBoundingClientRect();
	const deviceScale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2.5));
	const canvasWidth = Math.max(2, Math.round(boundingRect.width * deviceScale));
	const canvasHeight = Math.max(2, Math.round(boundingRect.height * deviceScale));
	const overlayCanvas = document.createElement('canvas');
	overlayCanvas.width = canvasWidth;
	overlayCanvas.height = canvasHeight;
	overlayCanvas.style.position = 'absolute';
	overlayCanvas.style.inset = '0';
	overlayCanvas.style.width = '100%';
	overlayCanvas.style.height = '100%';
	overlayCanvas.style.pointerEvents = 'none';
	const targetBorderRadius = getComputedStyle(targetEl).borderRadius || '10px';
	overlayCanvas.style.borderRadius = targetBorderRadius;
	overlayCanvas.style.zIndex = '5';
	overlayCanvas.style.mixBlendMode = mode === 'might' ? 'hard-light' : 'screen';
	overlayCanvas.style.filter =
		mode === 'might'
			? 'brightness(1.05) contrast(1.25) saturate(1.1)'
			: 'brightness(1.15) saturate(1.35)';
	const overlayCtx = overlayCanvas.getContext('2d');
	if (!overlayCtx) return;

	const maskedContentWrapper = document.createElement('div');
	maskedContentWrapper.className = 'defeat-mask-wrapper';
	maskedContentWrapper.style.position = 'relative';
	maskedContentWrapper.style.inset = '0';
	maskedContentWrapper.style.width = '100%';
	maskedContentWrapper.style.height = '100%';
	maskedContentWrapper.style.borderRadius = targetBorderRadius;
	maskedContentWrapper.style.overflow = 'hidden';
	maskedContentWrapper.style.zIndex = '0';

	while (targetEl.firstChild) {
		maskedContentWrapper.appendChild(targetEl.firstChild);
	}
	targetEl.appendChild(maskedContentWrapper);
	targetEl.appendChild(overlayCanvas);

	const maskCanvas = document.createElement('canvas');
	maskCanvas.width = canvasWidth;
	maskCanvas.height = canvasHeight;
	const maskCtx = maskCanvas.getContext('2d');
	if (maskCtx) {
		maskCtx.fillStyle = '#ffffff';
		maskCtx.fillRect(0, 0, canvasWidth, canvasHeight);
	}

	type VendorMaskStyle = CSSStyleDeclaration & {
		webkitMaskImage?: string;
		webkitMaskSize?: string;
		webkitMaskRepeat?: string;
		webkitMaskPosition?: string;
	};
	const styleWithVendorMasks = maskedContentWrapper.style as VendorMaskStyle;
	const originalPositionStyle = targetEl.style.position;
	const computedPosition = getComputedStyle(targetEl).position;
	if (!computedPosition || computedPosition === 'static') {
		targetEl.style.position = 'relative';
	}

	targetEl.dataset.defeatEffectActive = '1';
	targetEl.classList.add('defeat-active', `defeat-${mode}`);

	let maskPendingUpload = false;
	let lastMaskUploadTimestamp = performance.now();
	const maskUploadIntervalMs = 60;
	const applyMaskTexture = (stamp?: number) => {
		if (!maskCtx) return;
		const maskDataUrl = maskCanvas.toDataURL('image/png');
		maskedContentWrapper.style.maskImage = `url(${maskDataUrl})`;
		maskedContentWrapper.style.maskSize = '100% 100%';
		maskedContentWrapper.style.maskRepeat = 'no-repeat';
		maskedContentWrapper.style.maskPosition = '0 0';
		maskedContentWrapper.style.maskMode = 'alpha';
		styleWithVendorMasks.webkitMaskImage = `url(${maskDataUrl})`;
		styleWithVendorMasks.webkitMaskSize = '100% 100%';
		styleWithVendorMasks.webkitMaskRepeat = 'no-repeat';
		styleWithVendorMasks.webkitMaskPosition = '0 0';
		maskPendingUpload = false;
		lastMaskUploadTimestamp = stamp ?? performance.now();
	};
	if (maskCtx) {
		applyMaskTexture();
	}

	const particleCount = Math.min(
		260,
		Math.max(110, Math.round((canvasWidth * canvasHeight) / 950))
	);
	const particles: DefeatParticle[] = [];

	const carveCircleIntoMask = (px: number, py: number, radiusPx: number, strength: number) => {
		if (!maskCtx) return;
		const effectiveStrength = Math.max(0.05, Math.min(1, strength));
		maskCtx.save();
		maskCtx.globalCompositeOperation = 'destination-out';
		const gradient = maskCtx.createRadialGradient(px, py, radiusPx * 0.25, px, py, radiusPx);
		gradient.addColorStop(0, `rgba(0, 0, 0, ${effectiveStrength})`);
		gradient.addColorStop(0.55, `rgba(0, 0, 0, ${effectiveStrength * 0.6})`);
		gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
		maskCtx.fillStyle = gradient;
		maskCtx.beginPath();
		maskCtx.arc(px, py, radiusPx, 0, Math.PI * 2);
		maskCtx.fill();
		maskCtx.restore();
		maskPendingUpload = true;
	};

	const carveImpactIntoMask = (
		px: number,
		py: number,
		widthPx: number,
		heightPx: number,
		rotation: number,
		strength: number
	) => {
		if (!maskCtx) return;
		const impactStrength = Math.max(0.05, Math.min(1, strength));
		maskCtx.save();
		maskCtx.translate(px, py);
		maskCtx.rotate(rotation);
		maskCtx.globalCompositeOperation = 'destination-out';
		maskCtx.fillStyle = `rgba(0, 0, 0, ${impactStrength})`;
		maskCtx.beginPath();
		maskCtx.moveTo(-widthPx * 0.5, heightPx * 0.5);
		maskCtx.lineTo(-widthPx * 0.2, -heightPx * 0.4);
		maskCtx.lineTo(widthPx * 0.15, -heightPx * 0.2);
		maskCtx.lineTo(widthPx * 0.5, heightPx * 0.5);
		maskCtx.closePath();
		maskCtx.fill();
		maskCtx.restore();
		maskPendingUpload = true;
	};

	const spawnFireParticle = (): FireDefeatParticle => ({
		type: 'fire',
		px: Math.random(),
		py: 0.55 + Math.random() * 0.4,
		vx: (Math.random() - 0.5) * 0.24,
		vy: -0.55 - Math.random() * 0.42,
		life: 0,
		maxLife: 0.85 + Math.random() * 1.1,
		size: 0.07 + Math.random() * 0.11,
		flickerSpeed: 6 + Math.random() * 7
	});

	const spawnMagicParticle = (): MagicDefeatParticle => {
		const baseRadius = 0.06 + Math.random() * 0.32;
		return {
			type: 'magic',
			angle: Math.random() * Math.PI * 2,
			radius: baseRadius,
			angularVelocity: (Math.random() * 1.6 + 0.7) * (Math.random() > 0.5 ? 1 : -1),
			radiusVelocity: 0.22 + Math.random() * 0.28,
			px: 0.5,
			py: 0.5,
			life: 0,
			maxLife: 1.25 + Math.random() * 1.2,
			size: 0.06 + Math.random() * 0.09
		};
	};

	const spawnMightParticle = (): MightDefeatParticle => {
		const width = 0.05 + Math.random() * 0.09;
		const height = 0.16 + Math.random() * 0.26;
		return {
			type: 'might',
			px: 0.25 + Math.random() * 0.5,
			py: 0.18 + Math.random() * 0.45,
			vx: (Math.random() - 0.5) * 0.68,
			vy: 0.6 + Math.random() * 0.7,
			rotation: (Math.random() - 0.5) * 0.8,
			rotationVelocity: (Math.random() - 0.5) * 6,
			life: 0,
			maxLife: 1 + Math.random() * 1.2,
			width,
			height,
			notchOffsetLeft: (Math.random() - 0.5) * 0.6,
			notchOffsetRight: (Math.random() - 0.5) * 0.6,
			fractureDepth: 0.35 + Math.random() * 0.45,
			baseAlpha: 0.75 + Math.random() * 0.25
		};
	};

	const buildParticle = (): DefeatParticle => {
		if (mode === 'fire') return spawnFireParticle();
		if (mode === 'magic') return spawnMagicParticle();
		return spawnMightParticle();
	};

	for (let i = 0; i < particleCount; i++) {
		particles.push(buildParticle());
	}

	const rotationTarget = mode === 'might' ? -8 : mode === 'magic' ? 4 : 9;
	const translationTarget = mode === 'might' ? 18 : 12;
	const scaleTarget = mode === 'might' ? 0.82 : 0.78;

	let cleanedUp = false;
	const fadeAnimation = targetEl.animate(
		[
			{
				transform: 'translateZ(0) scale(1)',
				filter: 'saturate(1) brightness(1)',
				opacity: 1
			},
			{
				transform: 'translateZ(0) translateY(6px) scale(0.94)',
				filter: 'saturate(0.7) brightness(0.85)',
				opacity: 0.68
			},
			{
				transform: `translateZ(0) translateY(${translationTarget}px) rotate(${rotationTarget}deg) scale(${scaleTarget})`,
				filter: 'saturate(0.2) brightness(0.55) blur(2px)',
				opacity: 0
			}
		],
		{ duration: durationMs, easing: 'ease-in', fill: 'forwards' }
	);

	const startTimestamp = performance.now();
	let lastTimestamp = startTimestamp;

	const drawFrame = (timestamp: number) => {
		const elapsedMs = timestamp - startTimestamp;
		const deltaSeconds = Math.max(0.001, (timestamp - lastTimestamp) / 1000);
		lastTimestamp = timestamp;
		const normalized = Math.min(1, elapsedMs / durationMs);

		overlayCtx.globalCompositeOperation = 'source-over';
		overlayCtx.clearRect(0, 0, canvasWidth, canvasHeight);
		overlayCtx.globalCompositeOperation = mode === 'might' ? 'screen' : 'lighter';
		if (maskCtx) {
			const erosionStrength = Math.min(0.18, normalized * 0.14);
			if (erosionStrength > 0.01) {
				maskCtx.save();
				maskCtx.globalCompositeOperation = 'destination-out';
				maskCtx.fillStyle = `rgba(0, 0, 0, ${erosionStrength})`;
				maskCtx.fillRect(
					canvasWidth * 0.08,
					canvasHeight * (0.65 + normalized * 0.25),
					canvasWidth * 0.84,
					canvasHeight * 0.45
				);
				maskCtx.restore();
				maskPendingUpload = true;
			}
		}

		if (mode === 'might') {
			const smashFlashStrength = Math.max(0, 1 - normalized * 1.05);
			if (smashFlashStrength > 0.01) {
				overlayCtx.save();
				overlayCtx.globalAlpha = smashFlashStrength * 0.55;
				overlayCtx.fillStyle = 'rgba(255, 242, 210, 1)';
				overlayCtx.beginPath();
				overlayCtx.ellipse(
					canvasWidth * 0.5,
					canvasHeight * 0.58,
					canvasWidth * (0.26 + smashFlashStrength * 0.28),
					canvasHeight * (0.2 + smashFlashStrength * 0.18),
					0,
					0,
					Math.PI * 2
				);
				overlayCtx.fill();
				overlayCtx.globalAlpha = smashFlashStrength * 0.45;
				overlayCtx.lineWidth = Math.max(2, canvasWidth * 0.012);
				overlayCtx.strokeStyle = 'rgba(255, 210, 130, 1)';
				overlayCtx.beginPath();
				overlayCtx.moveTo(canvasWidth * 0.5, canvasHeight * 0.18);
				overlayCtx.lineTo(canvasWidth * 0.5, canvasHeight * 0.88);
				overlayCtx.moveTo(canvasWidth * 0.32, canvasHeight * 0.32);
				overlayCtx.lineTo(canvasWidth * 0.68, canvasHeight * 0.78);
				overlayCtx.moveTo(canvasWidth * 0.68, canvasHeight * 0.32);
				overlayCtx.lineTo(canvasWidth * 0.32, canvasHeight * 0.78);
				overlayCtx.stroke();
				overlayCtx.restore();
			}
		}

		const centerX = 0.5;
		const centerY = 0.5;

		for (let i = 0; i < particles.length; i++) {
			const particle = particles[i];
			const lifeRatio = Math.min(1, particle.life / particle.maxLife);
			const remaining = 1 - lifeRatio;

			if (particle.type === 'fire') {
				particle.life += deltaSeconds * (1.1 + normalized * 0.6);
				particle.px += particle.vx * deltaSeconds;
				particle.py += particle.vy * deltaSeconds * (0.9 + normalized * 0.7);
				if (particle.py < -0.1 || particle.life >= particle.maxLife) {
					particles[i] = spawnFireParticle();
					continue;
				}
				const px = particle.px * canvasWidth;
				const py = particle.py * canvasHeight;
				const sizePx = particle.size * canvasWidth;
				const flicker = 0.7 + Math.sin((timestamp / 1000) * particle.flickerSpeed) * 0.35;
				const alpha = Math.min(1.2, remaining * 1.35) * 1.05 * flicker;
				const gradient = overlayCtx.createRadialGradient(px, py, sizePx * 0.12, px, py, sizePx);
				gradient.addColorStop(0, `rgba(255, 250, 200, ${Math.min(1, alpha * 1.1)})`);
				gradient.addColorStop(0.35, `rgba(255, 170, 60, ${alpha})`);
				gradient.addColorStop(0.7, `rgba(255, 80, 30, ${alpha * 0.8})`);
				gradient.addColorStop(1, 'rgba(60, 10, 0, 0)');
				overlayCtx.fillStyle = gradient;
				overlayCtx.beginPath();
				overlayCtx.arc(px, py, sizePx, 0, Math.PI * 2);
				overlayCtx.fill();
				carveCircleIntoMask(px, py, sizePx * (1.6 + normalized * 0.8), 0.6 + normalized * 0.45);
				continue;
			}

			if (particle.type === 'magic') {
				particle.life += deltaSeconds;
				particle.radius += particle.radiusVelocity * deltaSeconds * (0.9 + normalized * 0.4);
				particle.angle += particle.angularVelocity * deltaSeconds;
				const spiralLift = 0.04 + normalized * 0.08;
				particle.py =
					centerY + Math.sin(particle.angle) * particle.radius * 0.7 - normalized * spiralLift;
				particle.px = centerX + Math.cos(particle.angle) * particle.radius * 0.9;
				if (particle.life >= particle.maxLife) {
					particles[i] = spawnMagicParticle();
					continue;
				}
				const px = particle.px * canvasWidth;
				const py = particle.py * canvasHeight;
				const sizePx = particle.size * canvasWidth;
				const alpha = Math.min(1.15, remaining * 1.35);
				const gradient = overlayCtx.createRadialGradient(px, py, sizePx * 0.16, px, py, sizePx);
				gradient.addColorStop(0, `rgba(230, 245, 255, ${Math.min(1, alpha * 1.1)})`);
				gradient.addColorStop(0.45, `rgba(150, 190, 255, ${alpha})`);
				gradient.addColorStop(0.82, `rgba(70, 110, 255, ${alpha * 0.65})`);
				gradient.addColorStop(1, 'rgba(15, 0, 80, 0)');
				overlayCtx.fillStyle = gradient;
				overlayCtx.beginPath();
				overlayCtx.arc(px, py, sizePx, 0, Math.PI * 2);
				overlayCtx.fill();
				carveCircleIntoMask(px, py, sizePx * (1.8 + normalized * 1.1), 0.5 + normalized * 0.5);
				continue;
			}

			particle.life += deltaSeconds * (0.9 + normalized * 0.5);
			particle.vy += 1.4 * deltaSeconds;
			particle.px += particle.vx * deltaSeconds;
			particle.py += particle.vy * deltaSeconds;
			particle.rotation += particle.rotationVelocity * deltaSeconds;
			const offscreen =
				particle.py > 1.2 ||
				particle.px < -0.2 ||
				particle.px > 1.2 ||
				particle.life >= particle.maxLife;
			if (offscreen) {
				particles[i] = spawnMightParticle();
				continue;
			}
			const px = particle.px * canvasWidth;
			const py = particle.py * canvasHeight;
			const widthPx = particle.width * canvasWidth;
			const heightPx = particle.height * canvasHeight;
			const alpha = Math.min(1, remaining * 1.15) * particle.baseAlpha;
			overlayCtx.save();
			overlayCtx.translate(px, py);
			overlayCtx.rotate(particle.rotation);
			overlayCtx.beginPath();
			overlayCtx.moveTo(-widthPx * 0.5, heightPx * 0.5);
			overlayCtx.lineTo(
				-widthPx * (0.25 + particle.notchOffsetLeft * 0.25),
				-heightPx * particle.fractureDepth
			);
			overlayCtx.lineTo(widthPx * (0.2 + particle.notchOffsetRight * 0.25), -heightPx * 0.25);
			overlayCtx.lineTo(widthPx * 0.5, heightPx * 0.5);
			overlayCtx.closePath();
			overlayCtx.fillStyle = `rgba(185, 130, 55, ${alpha})`;
			overlayCtx.fill();
			overlayCtx.strokeStyle = `rgba(85, 45, 10, ${Math.min(1, alpha * 1.1)})`;
			overlayCtx.lineWidth = Math.max(1.2, widthPx * 0.1);
			overlayCtx.stroke();
			overlayCtx.beginPath();
			overlayCtx.moveTo(0, -heightPx * 0.3);
			overlayCtx.lineTo(0, heightPx * 0.5);
			overlayCtx.moveTo(-widthPx * 0.18, -heightPx * 0.1);
			overlayCtx.lineTo(-widthPx * 0.05, heightPx * 0.4);
			overlayCtx.moveTo(widthPx * 0.18, -heightPx * 0.05);
			overlayCtx.lineTo(widthPx * 0.05, heightPx * 0.45);
			overlayCtx.strokeStyle = `rgba(255, 230, 190, ${alpha * 0.7})`;
			overlayCtx.lineWidth = Math.max(0.8, widthPx * 0.06);
			overlayCtx.stroke();
			overlayCtx.restore();
			carveImpactIntoMask(
				px,
				py,
				widthPx * (1.2 + normalized * 0.8),
				heightPx * (1.1 + normalized * 0.6),
				particle.rotation,
				0.65 + normalized * 0.5
			);
		}

		if (
			maskCtx &&
			maskPendingUpload &&
			(timestamp - lastMaskUploadTimestamp >= maskUploadIntervalMs || normalized >= 1)
		) {
			applyMaskTexture(timestamp);
		}

		if (normalized < 1) {
			requestAnimationFrame(drawFrame);
		} else {
			cleanup();
		}
	};

	const cleanup = () => {
		if (cleanedUp) return;
		cleanedUp = true;
		if (typeof fadeAnimation.commitStyles === 'function') {
			fadeAnimation.commitStyles();
		}
		fadeAnimation.cancel();
		targetEl.style.opacity = '0';
		targetEl.style.transform = `translateZ(0) translateY(${translationTarget}px) scale(${scaleTarget})`;
		targetEl.style.filter = 'saturate(0.15) brightness(0.4) blur(2px)';
		targetEl.style.pointerEvents = 'none';
		targetEl.classList.remove('defeat-active', `defeat-${mode}`);
		delete targetEl.dataset.defeatEffectActive;
		if (maskCtx) {
			maskedContentWrapper.style.maskImage = '';
			maskedContentWrapper.style.maskSize = '';
			maskedContentWrapper.style.maskRepeat = '';
			maskedContentWrapper.style.maskPosition = '';
			maskedContentWrapper.style.maskMode = '';
			styleWithVendorMasks.webkitMaskImage = '';
			styleWithVendorMasks.webkitMaskSize = '';
			styleWithVendorMasks.webkitMaskRepeat = '';
			styleWithVendorMasks.webkitMaskPosition = '';
		}
		overlayCanvas.remove();
		while (maskedContentWrapper.firstChild) {
			targetEl.appendChild(maskedContentWrapper.firstChild);
		}
		maskedContentWrapper.remove();
		fadeAnimation.removeEventListener('finish', cleanup);
		if (!originalPositionStyle && computedPosition === 'static') {
			targetEl.style.position = '';
		} else {
			targetEl.style.position = originalPositionStyle;
		}
	};

	fadeAnimation.addEventListener('finish', cleanup);

	requestAnimationFrame(drawFrame);
}
