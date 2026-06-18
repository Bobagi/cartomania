<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import CardComposite from '$lib/components/CardComposite.svelte';
	import CardFxFilters from '$lib/cards/CardFxFilters.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import { fetchCartomaniaCardCatalog } from '$lib/api/GameClient';
	import {
		createHoloTilt,
		foilStyleVars,
		FOIL_DEFAULTS,
		FOIL_PALETTES,
		HOLO_TILT_DEFAULTS,
		type HoloTiltController
	} from '$lib/cards/holoTilt';
	import {
		CardDestroyer,
		DESTRUCTION_DEFAULTS,
		type DestructionType
	} from '$lib/cards/cardDestruction';
	import '$lib/cards/cardFx.css';
	// Same card styling the gallery/duel load, so the lab card renders identically.
	import '../game/game.css';
	import '$lib/styles/routes/gameDuelPage.css';

	type LabCard = {
		code: string;
		name: string;
		description: string;
		imageUrl: string;
		magic: number;
		might: number;
		fire: number;
		number: number;
	};

	const STORAGE_KEY = 'cardfx-tweaks-v1';

	// Card-text styling defaults — must match the fallbacks in game/fonts.css and the
	// prop defaults in CardComposite. Tune here, then bake the exported values there.
	const CARD_TEXT_DEFAULTS = {
		ccOutlineColor: '#000000',
		ccOutlineSize: 0.09, // em-fraction; visible outline = this × 1em (stroke is doubled internally)
		ccTextColor: '#ffffff',
		// elastic title banner (must match the CSS fallbacks in CardComposite)
		ccBannerH: 25, // cqh — banner height
		ccBannerTop: 2.2, // %
		ccBannerRight: 1, // %
		ccBannerMin: 21, // cqw — min ribbon width (short names)
		ccNameFactor: 0.29, // name font = banner height * this
		ccNumFactor: 0.26, // number font = banner height * this
		ccNumX: 50.5, // % within the right ornament
		ccNumY: 35.5, // %
		// attribute values + labels
		ccValSize: 8, // cqh
		ccLabelSize: 5.6,
		// per-element font choices (values must be valid CSS font-family names)
		ccNameFont: 'Morpheus',
		ccNumFont: 'Draco',
		ccValFont: 'Draco',
		ccLabelFont: 'Draco'
	};

	// One flat tweaks object: tilt + foil + destruction + card text.
	let t = {
		...HOLO_TILT_DEFAULTS,
		...FOIL_DEFAULTS,
		...DESTRUCTION_DEFAULTS,
		...CARD_TEXT_DEFAULTS,
		foilOn: true
	};

	let cards: LabCard[] = [];
	let selectedCode = '';
	let exportText = '';
	let copied = false;

	let sceneEl: HTMLDivElement;
	let cardEl: HTMLDivElement;
	let canvasEl: HTMLCanvasElement;
	let tilt: HoloTiltController | null = null;
	let destroyer: CardDestroyer | null = null;

	$: selectedCard = cards.find((c) => c.code === selectedCode) ?? null;
	$: foilVars = t.foilOn ? foilStyleVars(t) : '';
	$: cardTextVars = [
		`--cc-outline-color:${t.ccOutlineColor}`,
		`--cc-outline-size:${t.ccOutlineSize}`,
		`--cc-text-color:${t.ccTextColor}`,
		`--cc-banner-h:${t.ccBannerH}cqh`,
		`--cc-banner-top:${t.ccBannerTop}%`,
		`--cc-banner-right:${t.ccBannerRight}%`,
		`--cc-banner-min:${t.ccBannerMin}cqw`,
		`--cc-name-factor:${t.ccNameFactor}`,
		`--cc-num-factor:${t.ccNumFactor}`,
		`--cc-num-x:${t.ccNumX}%`,
		`--cc-num-y:${t.ccNumY}%`,
		`--cc-val-size:${t.ccValSize}cqh`,
		`--cc-label-size:${t.ccLabelSize}cqh`,
		`--cc-name-font:'${t.ccNameFont}'`,
		`--cc-num-font:'${t.ccNumFont}'`,
		`--cc-val-font:'${t.ccValFont}'`,
		`--cc-label-font:'${t.ccLabelFont}'`
	].join(';');

	function loadSaved() {
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) t = { ...t, ...JSON.parse(raw) };
		} catch {
			/* ignore */
		}
	}
	function persist() {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
		} catch {
			/* ignore */
		}
	}
	$: if (typeof window !== 'undefined' && t) persist();

	function setTweak(key: string, value: number) {
		t = { ...t, [key]: value };
	}

	function play(type: DestructionType) {
		destroyer?.play(type, t);
	}
	function reset() {
		destroyer?.reset(true);
	}

	function exportValues() {
		exportText = JSON.stringify(t, null, 2);
		try {
			navigator.clipboard?.writeText(exportText);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* ignore */
		}
	}
	function resetDefaults() {
		t = {
			...HOLO_TILT_DEFAULTS,
			...FOIL_DEFAULTS,
			...DESTRUCTION_DEFAULTS,
			...CARD_TEXT_DEFAULTS,
			foilOn: true
		};
	}

	onMount(async () => {
		loadSaved();
		try {
			const collections = await fetchCartomaniaCardCatalog();
			const flat: LabCard[] = [];
			for (const col of collections ?? []) {
				for (const raw of (col?.cards ?? []) as Record<string, unknown>[]) {
					const imageUrl = (raw.imageUrl ?? raw.image ?? '') as string;
					if (!imageUrl) continue;
					flat.push({
						code: String(raw.code),
						name: (raw.name as string) ?? String(raw.code),
						description: (raw.description as string) ?? '',
						imageUrl,
						magic: Number(raw.magic ?? 0),
						might: Number(raw.might ?? 0),
						fire: Number(raw.fire ?? 0),
						number: Number(raw.number ?? 0)
					});
				}
			}
			cards = flat;
			if (cards.length) selectedCode = cards[0].code;
		} catch {
			cards = [];
		}
		tilt = createHoloTilt(cardEl, sceneEl, () => t);
		destroyer = new CardDestroyer({
			card: cardEl,
			wrap: cardEl.parentElement as HTMLElement,
			canvas: canvasEl,
			setFrozen: (f) => tilt?.setFrozen(f)
		});
	});
	onDestroy(() => {
		tilt?.destroy();
		destroyer?.reset(true);
	});

	const paletteOptions = Object.keys(FOIL_PALETTES);
	const blendOptions = ['color-dodge', 'screen', 'overlay', 'hard-light', 'soft-light', 'lighten'];
</script>

<svelte:head><title>Card FX Lab · Cartomania</title></svelte:head>

<CardFxFilters />

<div class="lab">
	<BackButton floating href="/" />
	<div class="lab__stage">
		<div class="cardfx-scene" bind:this={sceneEl} style="perspective:1100px">
			<div class="cardfx-wrap">
				<div class="cardfx-glow"></div>
				<div
					class="cardfx-card"
					bind:this={cardEl}
					style={`--cardfx-radius:14px;${foilVars};${cardTextVars}`}
				>
					{#if selectedCard}
						<CardComposite
							artImageUrl={selectedCard.imageUrl}
							frameImageUrl="/frames/default.png"
							titleImageUrl="/frames/title.png"
							titleText={selectedCard.name}
							descriptionText={selectedCard.description}
							magicValue={selectedCard.magic}
							mightValue={selectedCard.might}
							fireValue={selectedCard.fire}
							cornerNumberValue={selectedCard.number}
							enableTilt={false}
						/>
					{:else}
						<div class="lab__placeholder">loading card…</div>
					{/if}
					{#if t.foilOn}
						<div class="cardfx-foil">
							<div class="layer-irid"></div>
							<div class="layer-sheen"></div>
							<div class="layer-spec"></div>
						</div>
					{/if}
				</div>
				<canvas class="fx-canvas" bind:this={canvasEl}></canvas>
			</div>
		</div>

		<div class="lab__actions">
			<button class="fxbtn burn" on:click={() => play('burn')}>🔥 Burn</button>
			<button class="fxbtn crush" on:click={() => play('crush')}>👊 Crush</button>
			<button class="fxbtn dissolve" on:click={() => play('dissolve')}>✨ Dissolve</button>
			<button class="fxbtn ghost" on:click={reset}>Reset</button>
		</div>
	</div>

	<aside class="lab__panel">
		<h1>Card FX Lab</h1>
		<p class="lab__hint">
			Tune the effects here. Values auto-save in this browser. Hit <b>Export</b> and send me the JSON
			to bake your chosen values into the game for everyone.
		</p>

		<div class="row">
			<label for="card">Card</label>
			<select id="card" bind:value={selectedCode}>
				{#each cards as c (c.code)}<option value={c.code}>{c.name}</option>{/each}
			</select>
		</div>

		<h2>Holographic foil</h2>
		<label class="toggle"><input type="checkbox" bind:checked={t.foilOn} /> Foil enabled</label>
		<div class="row">
			<label for="pal">Palette</label>
			<select id="pal" bind:value={t.palette}>
				{#each paletteOptions as p}<option value={p}>{p}</option>{/each}
			</select>
		</div>
		<div class="row">
			<label for="bl">Blend</label>
			<select id="bl" bind:value={t.iridBlend}>
				{#each blendOptions as b}<option value={b}>{b}</option>{/each}
			</select>
		</div>
		{#each [['iridIntensity', 'Foil intensity', 0, 1, 0.05], ['iridSat', 'Foil saturation', 0, 2.5, 0.05], ['iridBright', 'Foil brightness', 0.5, 2, 0.05], ['iridScale', 'Foil grain %', 80, 400, 10], ['sheenIntensity', 'Sheen sweep', 0, 0.8, 0.02], ['specIntensity', 'Specular', 0, 1, 0.05], ['specSize', 'Specular size', 80, 620, 10], ['glowIntensity', 'Ambient glow', 0, 1.2, 0.05], ['glowBlur', 'Glow blur', 0, 140, 4]] as [key, lbl, min, max, step]}
			<div class="slider">
				<span>{lbl}</span>
				<input
					type="range"
					{min}
					{max}
					{step}
					value={t[key]}
					on:input={(e) => setTweak(key, +e.currentTarget.value)}
				/>
				<b>{t[key]}</b>
			</div>
		{/each}

		<h2>Card text — fonts</h2>
		<div class="row">
			<label for="cnf">Name font</label>
			<select id="cnf" bind:value={t.ccNameFont}>
				<option value="Morpheus">Morpheus</option>
				<option value="Draco">Draco (Exocet)</option>
			</select>
		</div>
		<div class="row">
			<label for="cnuf">Number font</label>
			<select id="cnuf" bind:value={t.ccNumFont}>
				<option value="Draco">Draco (Exocet)</option>
				<option value="Morpheus">Morpheus</option>
			</select>
		</div>
		<div class="row">
			<label for="cvf">Attr value font</label>
			<select id="cvf" bind:value={t.ccValFont}>
				<option value="Draco">Draco (Exocet)</option>
				<option value="Morpheus">Morpheus</option>
			</select>
		</div>
		<div class="row">
			<label for="clf">Attr label font</label>
			<select id="clf" bind:value={t.ccLabelFont}>
				<option value="Draco">Draco (Exocet)</option>
				<option value="Morpheus">Morpheus</option>
			</select>
		</div>

		<h2>Card text — size / outline / position</h2>
		<div class="row">
			<label for="tc">Text color</label>
			<input id="tc" type="color" bind:value={t.ccTextColor} />
			<label for="sc">Outline color</label>
			<input id="sc" type="color" bind:value={t.ccOutlineColor} />
		</div>
		{#each [['ccBannerH', 'Banner height (cqh)', 8, 36, 0.2], ['ccBannerTop', 'Banner top %', 0, 12, 0.2], ['ccBannerRight', 'Banner right %', 0, 12, 0.2], ['ccBannerMin', 'Ribbon min width (cqw)', 8, 45, 0.5], ['ccNameFactor', 'Name size ×height', 0.1, 0.55, 0.005], ['ccOutlineSize', 'Outline thickness (×em)', 0.02, 1.0, 0.005], ['ccNumFactor', 'Number size ×height', 0.08, 0.9, 0.01], ['ccNumX', 'Number X %', 20, 70, 0.5], ['ccNumY', 'Number Y %', 15, 65, 0.5], ['ccValSize', 'Attr value size (cqh)', 4, 16, 0.2], ['ccLabelSize', 'Attr label size (cqh)', 2, 9, 0.2]] as [key, lbl, min, max, step]}
			<div class="slider">
				<span>{lbl}</span>
				<input
					type="range"
					{min}
					{max}
					{step}
					value={t[key]}
					on:input={(e) => setTweak(key, +e.currentTarget.value)}
				/>
				<b>{t[key]}</b>
			</div>
		{/each}

		<h2>Motion / tilt</h2>
		{#each [['maxTilt', 'Max tilt °', 0, 32, 1], ['smoothing', 'Responsiveness', 0.03, 0.4, 0.01], ['liftZ', 'Hover lift', 0, 90, 2], ['iridShift', 'Foil shift w/ tilt', 0, 80, 2], ['idleSpeed', 'Idle speed', 0.1, 2, 0.1]] as [key, lbl, min, max, step]}
			<div class="slider">
				<span>{lbl}</span>
				<input type="range" {min} {max} {step} bind:value={t[key]} />
				<b>{t[key]}</b>
			</div>
		{/each}
		<label class="toggle"><input type="checkbox" bind:checked={t.idleSway} /> Idle sway</label>

		<h2>Destruction</h2>
		{#each [['destructDuration', 'Duration s (burn/dissolve)', 0.8, 5, 0.1], ['grain', 'Particle grain', 0.025, 0.12, 0.005], ['edgeWidth', 'Edge width', 3, 16, 0.5], ['glowAmount', 'Edge glow', 0, 8, 0.5], ['charDarkness', 'Char darkness', 0, 1, 0.05], ['burnSpots', 'Burn holes', 0, 7, 1], ['particleCount', 'Particles', 0, 400, 10], ['crushViolence', 'Crush violence', 0.4, 1.6, 0.1]] as [key, lbl, min, max, step]}
			<div class="slider">
				<span>{lbl}</span>
				<input type="range" {min} {max} {step} bind:value={t[key]} />
				<b>{t[key]}</b>
			</div>
		{/each}
		<div class="row">
			<label for="fc">Burn color</label>
			<input id="fc" type="color" bind:value={t.fireColor} />
			<label for="dc">Dissolve</label>
			<input id="dc" type="color" bind:value={t.dissolveColor} />
		</div>
		<label class="toggle"><input type="checkbox" bind:checked={t.autoReset} /> Auto-reset</label>

		<div class="lab__export">
			<button class="fxbtn" on:click={exportValues}>{copied ? '✓ Copied' : 'Export values'}</button>
			<button class="fxbtn ghost" on:click={resetDefaults}>Defaults</button>
		</div>
		{#if exportText}<textarea readonly rows="6">{exportText}</textarea>{/if}
	</aside>
</div>

<style>
	.lab {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 340px;
		min-height: 100dvh;
		background: radial-gradient(120% 120% at 50% 18%, #15151b 0%, #0a0a0e 50%, #050507 100%);
		color: #e7e7ef;
	}
	.lab__stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 26px;
		padding: 32px;
	}
	.cardfx-card {
		width: clamp(240px, 42vh, 360px);
		aspect-ratio: 1444 / 1920;
	}
	.lab__placeholder {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		color: #777;
	}
	.lab__actions {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		justify-content: center;
	}
	.fxbtn {
		font: inherit;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: #e7e7ef;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 999px;
		padding: 9px 16px;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s,
			transform 0.1s;
	}
	.fxbtn:hover {
		background: rgba(255, 255, 255, 0.12);
		transform: translateY(-1px);
	}
	.fxbtn.burn:hover {
		color: #ffcaa0;
		border-color: rgba(255, 150, 90, 0.6);
	}
	.fxbtn.dissolve:hover {
		color: #a9eeff;
		border-color: rgba(110, 210, 255, 0.6);
	}
	.fxbtn.crush:hover {
		color: #fff;
		border-color: rgba(255, 255, 255, 0.5);
	}
	.fxbtn.ghost {
		color: #9aa;
	}
	.lab__panel {
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(10, 12, 18, 0.6);
		padding: 18px 18px 60px;
		overflow-y: auto;
		max-height: 100dvh;
	}
	.lab__panel h1 {
		font-size: 18px;
		margin: 0 0 6px;
	}
	.lab__panel h2 {
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: #ffd479;
		margin: 18px 0 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		padding-top: 12px;
	}
	.lab__hint {
		font-size: 12px;
		color: #9aa;
		line-height: 1.5;
		margin: 0 0 8px;
	}
	.slider {
		display: grid;
		grid-template-columns: 1fr 120px 38px;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		margin: 5px 0;
	}
	.slider b {
		text-align: right;
		color: #ffd479;
		font-variant-numeric: tabular-nums;
	}
	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		margin: 6px 0;
	}
	.row select,
	.row input[type='color'] {
		background: #14151c;
		color: #e7e7ef;
		border: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 6px;
		padding: 4px 6px;
	}
	.toggle {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		margin: 8px 0;
	}
	.lab__export {
		display: flex;
		gap: 10px;
		margin-top: 18px;
	}
	textarea {
		width: 100%;
		margin-top: 8px;
		background: #0c0d12;
		color: #cfe;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		font-family: ui-monospace, monospace;
		font-size: 11px;
		padding: 8px;
	}
	input[type='range'] {
		accent-color: #ffd479;
	}
	@media (max-width: 760px) {
		.lab {
			grid-template-columns: 1fr;
		}
	}
</style>
