<script lang="ts">
	import { t } from '$lib/i18n';
	import { afterUpdate } from 'svelte';
	import {
		ATTRIBUTE_META,
		type DuelHistoryCardInfo,
		type DuelHistoryItem,
		type DuelRoundRecord
	} from '$lib/duel/historyTypes';

	export let items: DuelHistoryItem[] = [];
	export let resolveCard: (code: string | null | undefined) => DuelHistoryCardInfo | null = () =>
		null;
	export let playerLabel = 'You';
	export let opponentLabel = 'Opponent';
	export let cardBackImageUrl = '/frames/card-back.png';

	let scrollEl: HTMLDivElement | null = null;
	let lastSignature = '';

	afterUpdate(() => {
		if (!scrollEl) return;
		const signature = `${items.length}:${items[items.length - 1]?.key ?? ''}`;
		if (signature !== lastSignature) {
			lastSignature = signature;
			scrollEl.scrollTop = scrollEl.scrollHeight;
		}
	});

	function thumbImage(code: string | null): string {
		const info = resolveCard(code);
		return info?.imageUrl || cardBackImageUrl;
	}

	function thumbName(code: string | null, fallback: string): string {
		const info = resolveCard(code);
		return info?.name || fallback;
	}

	function sideState(record: DuelRoundRecord, side: 'a' | 'b'): 'win' | 'lose' | 'draw' {
		if (record.outcome === 'draw') return 'draw';
		return record.outcome === side ? 'win' : 'lose';
	}
</script>

<div class="duel-history">
	<div class="history-head">
		<span class="history-title">{$t('duel.historyTitle')}</span>
		<span class="history-legend">
			<span class="legend-you">{playerLabel}</span>
			<span class="legend-sep">vs</span>
			<span class="legend-opp">{opponentLabel}</span>
		</span>
	</div>

	<div class="history-scroll" bind:this={scrollEl}>
		{#if items.length === 0}
			<div class="history-empty">
				<span class="history-empty-icon">⚔️</span>
				<p>{$t('duel.historyEmpty')}</p>
			</div>
		{:else}
			{#each items as item (item.key)}
				{#if item.kind === 'round'}
					{@const record = item.record}
					{@const meta = ATTRIBUTE_META[record.attribute]}
					<div class="round-card" class:is-live={record.live}>
						<div class="round-top">
							<span class="round-badge">{$t('duel.historyRound', { n: record.round })}</span>
							<span class={`attr-chip ${meta.cssClass}`}>
								<img src={meta.icon} alt="" />
								<span>{$t('attributes.' + record.attribute)}</span>
							</span>
							{#if record.live}<span class="live-tag">{$t('duel.historyLive')}</span>{/if}
						</div>

						<div class="clash">
							<div class={`fighter ${sideState(record, 'a')}`}>
								<div class="thumb">
									<img
										src={thumbImage(record.aCode)}
										alt={thumbName(record.aCode, record.aName)}
										loading="lazy"
										decoding="async"
									/>
									{#if sideState(record, 'a') === 'win'}<span class="crown">👑</span>{/if}
								</div>
								<div class="fighter-meta">
									<span class={`stat ${meta.cssClass}`}>{record.aVal ?? '-'}</span>
									<span class="card-name">{thumbName(record.aCode, record.aName)}</span>
								</div>
							</div>

							<div class="center-mark">
								<span class="versus">{record.outcome === 'draw' ? '=' : 'VS'}</span>
							</div>

							<div class={`fighter opp ${sideState(record, 'b')}`}>
								<div class="fighter-meta">
									<span class={`stat ${meta.cssClass}`}>{record.bVal ?? '-'}</span>
									<span class="card-name">{thumbName(record.bCode, record.bName)}</span>
								</div>
								<div class="thumb">
									<img
										src={thumbImage(record.bCode)}
										alt={thumbName(record.bCode, record.bName)}
										loading="lazy"
										decoding="async"
									/>
									{#if sideState(record, 'b') === 'win'}<span class="crown">👑</span>{/if}
								</div>
							</div>
						</div>

						<div class="round-result">
							{#if record.outcome === 'draw'}
								<span class="result-pill draw">{$t('duel.historyTie')}</span>
							{:else if record.outcome === 'a'}
								<span class="result-pill win">{$t('duel.historyYouWinRound')}</span>
							{:else}
								<span class="result-pill lose"
									>{$t('duel.historyOppWinsRound', { name: opponentLabel })}</span
								>
							{/if}
						</div>
					</div>
				{:else}
					<div class={`note-row ${item.tone}`}>
						<span class="note-icon" aria-hidden="true">{item.icon}</span>
						<span class="note-text">{item.text}</span>
					</div>
				{/if}
			{/each}
		{/if}
	</div>
</div>

<style>
	.duel-history {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		border-radius: 16px;
		background: linear-gradient(180deg, rgba(13, 19, 33, 0.92), rgba(8, 11, 20, 0.95));
		border: 1px solid rgba(120, 170, 255, 0.18);
		box-shadow:
			0 18px 40px rgba(0, 0, 0, 0.5),
			inset 0 1px 0 rgba(255, 255, 255, 0.05);
		overflow: hidden;
	}

	.history-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 11px 14px;
		background: linear-gradient(180deg, rgba(40, 56, 92, 0.55), rgba(20, 28, 48, 0.25));
		border-bottom: 1px solid rgba(120, 170, 255, 0.16);
	}

	.history-title {
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: 0.82rem;
		color: #eaf1ff;
	}

	.history-legend {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 0.72rem;
		font-weight: 700;
	}
	.legend-you {
		color: #7fe3ff;
	}
	.legend-opp {
		color: #ff9a9a;
	}
	.legend-sep {
		opacity: 0.55;
	}

	.history-scroll {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 12px;
		scrollbar-width: thin;
		scrollbar-color: rgba(120, 170, 255, 0.55) transparent;
		scroll-behavior: smooth;
	}
	.history-scroll::-webkit-scrollbar {
		width: 8px;
	}
	.history-scroll::-webkit-scrollbar-thumb {
		background: rgba(120, 170, 255, 0.5);
		border-radius: 999px;
	}

	.history-empty {
		margin: auto;
		text-align: center;
		color: rgba(220, 230, 245, 0.6);
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 24px 12px;
	}
	.history-empty-icon {
		font-size: 32px;
		opacity: 0.7;
	}
	.history-empty p {
		margin: 0;
		font-size: 0.85rem;
		max-width: 220px;
	}

	.round-card {
		border-radius: 12px;
		padding: 9px 11px 10px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
		animation: roundEnter 320ms ease both;
	}
	.round-card.is-live {
		border-color: rgba(255, 214, 130, 0.6);
		background: rgba(80, 64, 24, 0.22);
		box-shadow:
			0 0 0 1px rgba(255, 214, 130, 0.3),
			0 8px 22px rgba(0, 0, 0, 0.4);
	}

	@keyframes roundEnter {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.round-top {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}
	.round-badge {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(226, 234, 250, 0.78);
		background: rgba(255, 255, 255, 0.07);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		padding: 3px 9px;
	}
	.live-tag {
		margin-left: auto;
		font-size: 0.62rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		color: #2a1d00;
		background: linear-gradient(180deg, #ffe08a, #f5b942);
		border-radius: 6px;
		padding: 2px 7px;
		animation: livePulse 1.1s ease-in-out infinite;
	}
	@keyframes livePulse {
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}

	.attr-chip {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		font-size: 0.7rem;
		font-weight: 700;
		border-radius: 999px;
		padding: 3px 9px 3px 5px;
		border: 1px solid transparent;
	}
	.attr-chip img {
		width: 15px;
		height: 15px;
		object-fit: contain;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
	}
	.attr-chip.attr-fire {
		background: rgba(255, 110, 50, 0.16);
		border-color: rgba(255, 130, 60, 0.45);
		color: #ffcba0;
	}
	.attr-chip.attr-magic {
		background: rgba(120, 150, 255, 0.16);
		border-color: rgba(130, 160, 255, 0.45);
		color: #c4d2ff;
	}
	.attr-chip.attr-might {
		background: rgba(220, 170, 90, 0.16);
		border-color: rgba(220, 175, 95, 0.45);
		color: #f1d9a8;
	}

	.clash {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 8px;
	}

	.fighter {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
	}
	.fighter.opp {
		justify-content: flex-end;
	}

	.thumb {
		position: relative;
		flex: 0 0 auto;
		width: 38px;
		height: 53px;
		border-radius: 7px;
		overflow: hidden;
		border: 2px solid rgba(255, 255, 255, 0.16);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.45);
		background: #0c1018;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 22%;
		display: block;
	}
	.crown {
		position: absolute;
		top: -9px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 14px;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6));
	}

	.fighter-meta {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 2px;
		min-width: 0;
	}
	.fighter.opp .fighter-meta {
		align-items: flex-end;
		text-align: right;
	}
	.card-name {
		font-size: 0.74rem;
		font-weight: 600;
		color: #f3f7ff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 100%;
	}

	.stat {
		font-variant-numeric: tabular-nums;
		font-weight: 800;
		font-size: 1.35rem;
		line-height: 1;
	}
	.stat.attr-fire {
		color: #ffb27a;
	}
	.stat.attr-magic {
		color: #aebfff;
	}
	.stat.attr-might {
		color: #f0cd8c;
	}

	.center-mark {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.versus {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.06em;
		color: rgba(226, 234, 250, 0.7);
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 999px;
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
	}

	.fighter.win .thumb {
		border-color: rgba(255, 214, 120, 0.95);
		box-shadow:
			0 0 14px rgba(255, 200, 90, 0.6),
			0 4px 10px rgba(0, 0, 0, 0.45);
	}
	.fighter.win .card-name {
		color: #ffe7ad;
	}
	.fighter.lose {
		opacity: 0.55;
	}
	.fighter.lose .thumb {
		filter: grayscale(0.55) brightness(0.8);
	}

	.round-result {
		margin-top: 8px;
		display: flex;
		justify-content: center;
	}
	.result-pill {
		font-size: 0.68rem;
		font-weight: 700;
		border-radius: 999px;
		padding: 3px 12px;
		border: 1px solid transparent;
	}
	.result-pill.win {
		color: #bbf7d0;
		background: rgba(34, 197, 94, 0.16);
		border-color: rgba(34, 197, 94, 0.4);
	}
	.result-pill.lose {
		color: #fecaca;
		background: rgba(239, 68, 68, 0.14);
		border-color: rgba(239, 68, 68, 0.38);
	}
	.result-pill.draw {
		color: #e2e8f0;
		background: rgba(148, 163, 184, 0.16);
		border-color: rgba(148, 163, 184, 0.4);
	}

	.note-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 7px 11px;
		border-radius: 9px;
		font-size: 0.78rem;
		background: rgba(255, 255, 255, 0.05);
		border-left: 3px solid rgba(255, 255, 255, 0.25);
		color: #e9eefb;
	}
	.note-row.player {
		background: rgba(74, 208, 255, 0.12);
		border-left-color: rgba(74, 208, 255, 0.6);
	}
	.note-row.opponent {
		background: rgba(255, 120, 120, 0.12);
		border-left-color: rgba(255, 120, 120, 0.6);
	}

	@media (max-width: 720px) {
		.card-name {
			max-width: 72px;
			font-size: 0.72rem;
		}
		.thumb {
			width: 32px;
			height: 45px;
		}
		.stat {
			font-size: 1.15rem;
		}
	}
</style>
