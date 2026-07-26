<script lang="ts">
	import { onMount, afterUpdate } from 'svelte';
	import { t } from '$lib/i18n';

	export let artImageUrl: string;
	export let frameImageUrl: string;
	export let titleImageUrl: string | null = null;
	export let titleText: string | null = null;
	export let aspectWidth = 1444;
	export let aspectHeight = 1920;
	export let artObjectFit: 'cover' | 'contain' = 'cover';
	export let titleTopPercent = 3;
	export let titleLeftPercent = 29;
	export let titleTextTopPercent = -1.5;
	export let titleTextLeftPercent = 32;
	export let titleHeightPercent = 18;
	export let enableTilt = true;
	export let tiltMaxRotateDeg = 14;
	export let tiltScale = 1.04;
	export let tiltTransitionMs = 120;
	export let descriptionText: string = '';
	export let magicValue: number = 0;
	export let mightValue: number = 0;
	export let fireValue: number = 0;
	export let cornerNumberValue: number = 1;
	export let titleBaseFontScale = 0.6;
	export let titleMaxFontScale = 0.4;
	export let titleStrokeFactor = 0.035;
	export let titleStrokeColor = '#000';

	let wrapperEl: HTMLDivElement | null = null;
	let cachedBoundingRect: DOMRect | null = null;
	let scheduledAnimationFrameId: number | null = null;
	let pendingRotateXDeg = 0;
	let pendingRotateYDeg = 0;
	let midEl: HTMLDivElement | null = null;
	let nameEl: HTMLSpanElement | null = null;

	function updateCachedBoundingRect() {
		if (wrapperEl) cachedBoundingRect = wrapperEl.getBoundingClientRect();
	}

	function handlePointerMove(e: PointerEvent) {
		if (!enableTilt || !wrapperEl) return;
		if (!cachedBoundingRect) updateCachedBoundingRect();
		const r = cachedBoundingRect!;
		const px = (e.clientX - r.left) / r.width;
		const py = (e.clientY - r.top) / r.height;
		pendingRotateYDeg = (px - 0.5) * 2 * tiltMaxRotateDeg;
		pendingRotateXDeg = -(py - 0.5) * 2 * tiltMaxRotateDeg;
		if (scheduledAnimationFrameId === null) {
			scheduledAnimationFrameId = requestAnimationFrame(() => {
				if (wrapperEl) {
					wrapperEl.style.transform = `translateZ(0) perspective(900px) rotateX(${pendingRotateXDeg}deg) rotateY(${pendingRotateYDeg}deg) scale(${tiltScale})`;
				}
				scheduledAnimationFrameId = null;
			});
		}
	}

	function handleMouseLeave() {
		if (!wrapperEl) return;
		if (scheduledAnimationFrameId !== null) cancelAnimationFrame(scheduledAnimationFrameId);
		scheduledAnimationFrameId = null;
		wrapperEl.style.transform =
			'translateZ(0) perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
	}

	function handleMouseEnter() {
		if (!wrapperEl) return;
		wrapperEl.style.transition = `transform ${tiltTransitionMs}ms ease`;
		updateCachedBoundingRect();
	}

	function makeBadge(iconPath: string, value: number, labelText: string) {
		return { iconPath, value, labelText };
	}

	// The flexbox stretches the ribbon with the name (pure CSS). JS only handles the rare
	// case where, even at the banner's max width, the name overflows - then it lowers a
	// scale multiplier (kept in CSS so the name still scales with the card) until it fits.
	// Bounded, synchronous, no observers/async - so it can never loop or hang.
	function fitBannerName() {
		if (!nameEl || !midEl) return;
		nameEl.style.setProperty('--name-shrink', '1');
		let shrink = 1;
		let guard = 12;
		while (guard-- > 0 && midEl.scrollWidth > midEl.clientWidth + 1) {
			shrink *= 0.92;
			nameEl.style.setProperty('--name-shrink', String(shrink));
		}
	}

	$: magicBadge = makeBadge(
		'/icons/magic_icon.png',
		magicValue,
		$t('attributes.magic').toUpperCase()
	);
	$: mightBadge = makeBadge(
		'/icons/strength_icon.png',
		mightValue,
		$t('attributes.might').toUpperCase()
	);
	$: fireBadge = makeBadge('/icons/fire_icon.png', fireValue, $t('attributes.fire').toUpperCase());

	$: tooltipText = descriptionText
		? `${titleText ?? 'Card'}: ${descriptionText}`
		: (titleText ?? 'Card');

	// Refit only when the NAME actually changes. afterUpdate runs after the DOM updates,
	// so the measure is accurate; the guard is a DOM attribute (not a reactive variable),
	// and writing --name-shrink is a plain style write - neither schedules another update,
	// so this can never feed back into itself.
	afterUpdate(() => {
		if (!nameEl || !midEl) return;
		const current = titleText ?? '';
		if (nameEl.dataset.fitted === current) return;
		nameEl.dataset.fitted = current;
		fitBannerName();
	});

	onMount(() => {
		// Re-measure once the real card font is ready (the ribbon stretch itself is CSS).
		if ((document as any).fonts && (document as any).fonts.ready) {
			(document as any).fonts.ready.then(() => fitBannerName()).catch(() => {});
		}
	});
</script>

<div
	bind:this={wrapperEl}
	on:pointermove={handlePointerMove}
	on:mouseleave={handleMouseLeave}
	on:mouseenter={handleMouseEnter}
	aria-label={titleText ?? 'card'}
	title={tooltipText}
	class="card-font"
	style={`position:relative;width:100%;aspect-ratio:${aspectWidth}/${aspectHeight};overflow:hidden;border-radius:5px;transform:translateZ(0) perspective(900px);will-change:transform;container-type:size;container-name:card;`}
>
	<div style="position:absolute;inset:0;display:flex;flex-direction:column;width:100%;height:100%;">
		<div style="position:relative;width:100%;height:70%;z-index:0;">
			<img
				src={artImageUrl}
				alt={titleText ?? 'card-art'}
				style={`position:absolute;inset:0;width:100%;height:100%;object-fit:${artObjectFit};display:block;padding: 6% 6% 0 6%;`}
				loading="lazy"
				decoding="async"
				draggable="false"
			/>
		</div>

		<div
			style="
        position:relative;height:30%;
        padding:0 2cqw 6cqh 2cqw;
        display:flex;justify-content:center;align-items:center;gap:3cqw;
        background-image:url('/frames/attributeBackground.png');
        background-size:cover;
        background-position:center bottom;
        background-repeat:no-repeat;
        border-top: 0.25cqh solid rgba(255,255,255,.18);
        z-index:0;
      "
		>
			{#each [magicBadge, mightBadge, fireBadge] as b}
				<div style="display:flex;flex-direction:column;align-items:center;gap:1.4cqh;min-width:0;">
					<div
						style="
              position:relative;
              width:15cqh;
              height:15cqh;
              background-image:url({b.iconPath});
              background-size:contain;
              background-repeat:no-repeat;
              background-position:center;
              flex:0 0 auto;
            "
						aria-label={b.labelText}
					>
						<div
							class="card-attribute-value"
							style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:5cqh;letter-spacing:-0.12em;text-rendering:optimizeLegibility;font-kerning:normal;transform:scaleX(0.92);"
						>
							{b.value}
						</div>
					</div>
					<div
						class="card-attribute-label"
						style="font-size:3cqh;line-height:1;white-space:nowrap;"
					>
						{b.labelText}
					</div>
				</div>
			{/each}
		</div>
	</div>

	<img
		src={frameImageUrl}
		alt="card-frame"
		style="position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:1;"
		loading="lazy"
		decoding="async"
		draggable="false"
	/>
	<!-- Elastic title banner (3-slice): fixed caps + a stretchy middle. Anchored right,
	     so long names grow the ribbon LEFTWARD like the printed cards. The stretch is
	     PURE CSS (flexbox) - no JS, so it's fast and can't hang. The number rides in the
	     right ornament. Outlines are text-shadows (a centred stroke thins the glyph).
	     Sits above the frame so the name/number are never covered by the stone border. -->
	<div class="cc-banner">
		<div class="cc-cap-l"></div>
		<div class="cc-mid" bind:this={midEl}>
			<span class="cc-name" bind:this={nameEl}>{titleText ?? ''}</span>
		</div>
		<div class="cc-cap-r">
			<span class="cc-num">{cornerNumberValue}</span>
		</div>
	</div>
</div>

<style>
	.cc-banner {
		--hb: var(--cc-banner-h, 25cqh);
		position: absolute;
		top: var(--cc-banner-top, 2.2%);
		right: var(--cc-banner-right, 1%);
		height: var(--hb);
		display: flex;
		align-items: stretch;
		z-index: 4;
		max-width: 92%;
		pointer-events: none;
		filter: drop-shadow(0 calc(var(--hb) * 0.03) calc(var(--hb) * 0.06) rgba(0, 0, 0, 0.55));
	}
	.cc-cap-l {
		flex: 0 0 auto;
		width: calc(var(--hb) * 0.2687);
		background: url('/frames/title-left.png') no-repeat;
		background-size: 100% 100%;
	}
	.cc-mid {
		flex: 0 1 auto;
		min-width: var(--cc-banner-min, 21cqw);
		background: url('/frames/title-mid.png');
		background-size: 100% 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		padding: calc(var(--hb) * 0.0746) 1.2cqw calc(var(--hb) * 0.5671);
	}
	.cc-cap-r {
		position: relative;
		flex: 0 0 auto;
		width: calc(var(--hb) * 0.6567);
		background: url('/frames/title-right.png') no-repeat;
		background-size: 100% 100%;
	}
	.cc-name {
		/* Sized off the banner height; --name-shrink only lowers when the name overflows.
		   Outline uses -webkit-text-stroke + paint-order (stroke painted first, fill on
		   top covers the inner half) - uniform at any thickness, no ghost-copy artefacts.
		   --cc-outline-size × 2em = total stroke; visible outer outline = --cc-outline-size × 1em. */
		font-family: var(--cc-name-font, 'Morpheus'), system-ui, sans-serif;
		font-size: calc(var(--hb) * var(--cc-name-factor, 0.29) * var(--name-shrink, 1));
		letter-spacing: 0.01em;
		color: var(--cc-text-color, #fff);
		text-transform: uppercase;
		white-space: nowrap;
		line-height: 1;
		transform: translateY(-4%);
		-webkit-text-stroke-width: calc(var(--cc-outline-size, 0.09) * 2em);
		-webkit-text-stroke-color: var(--cc-outline-color, #000);
		paint-order: stroke fill;
		text-shadow: none;
	}
	.cc-num {
		position: absolute;
		left: var(--cc-num-x, 50.5%);
		top: var(--cc-num-y, 35.5%);
		transform: translate(-50%, -50%);
		font-family: var(--cc-num-font, 'Draco'), system-ui, sans-serif;
		font-size: calc(var(--hb) * var(--cc-num-factor, 0.26));
		color: var(--cc-text-color, #fff);
		line-height: 1;
		-webkit-text-stroke-width: calc(var(--cc-outline-size, 0.09) * 2em);
		-webkit-text-stroke-color: var(--cc-outline-color, #000);
		paint-order: stroke fill;
		text-shadow: none;
	}
</style>
