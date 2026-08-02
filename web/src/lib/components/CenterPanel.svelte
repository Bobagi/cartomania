<script lang="ts">
	import { afterUpdate } from 'svelte';

	export let playerA: string;
	export let playerB: string;
	export let hpA: number;
	export let hpB: number;
	export let deckA: number;
	export let deckB: number;
	export let finalResult: { winner: string | null; log: string[] } | null = null;
	export let endedDueToNoCards = false;
	export let errorMessage: string | null = null;
	export let log: string[] | undefined;
	export let onRefresh: () => void;
	export let onSkipTurn: () => void;

	let logContainer: HTMLDivElement | null = null;

	function classifyLog(line: string): 'me' | 'opp' | 'sys' {
		const s = line.trim();
		const m = /^Player\s+(.+?)\s+played/i.exec(s);
		if (m) {
			const actor = m[1].toLowerCase();
			const me = (playerA ?? '').toLowerCase();
			return actor === me ? 'me' : 'opp';
		}
		if (/^bot\s+played/i.test(s)) return 'opp';
		return 'sys';
	}

	afterUpdate(() => {
		if (logContainer) {
			logContainer.scrollTop = logContainer.scrollHeight;
		}
	});
</script>

<section class="zone center">
	<!-- status pill -->
	<div class="status-pill">
		<div class="side">
			<span class="tag">👤</span><span class="who">{playerA}</span><span class="sep">•</span>
			<span class="tag">❤️</span>{hpA}
			<span class="sep">•</span><span class="tag">🃏</span>{deckA}
		</div>
		<div class="vs">VS</div>
		<div class="side">
			<span class="tag">👤</span><span class="who">{playerB}</span><span class="sep">•</span>
			<span class="tag">❤️</span>{hpB}
			<span class="sep">•</span><span class="tag">🃏</span>{deckB}
		</div>
	</div>

	<div class="center-right">
		{#if finalResult}
			<div class="notice success">
				<div class="title">Game finished</div>
				{#if finalResult.winner === null}
					<div class="msg">
						Tie game{endedDueToNoCards ? ', both players ran out of cards' : ''}.
					</div>
				{:else}
					<div class="msg">Winner: {finalResult.winner}</div>
				{/if}
				<div class="actions">
					<a class="btn" href="/">Back to home</a>
					<button class="btn ghost" on:click={onRefresh}>Refresh</button>
				</div>
			</div>
		{/if}

		{#if !finalResult && errorMessage}
			<div class="notice error">
				<div class="title">Network issue</div>
				<div class="msg">{errorMessage}</div>
				<button class="btn" on:click={onRefresh}>Try again</button>
			</div>
		{/if}

		{#if Array.isArray(log)}
			<div class="logbox" bind:this={logContainer}>
				{#each log as line}
					<div class={`logline ${classifyLog(line)}`}>{line}</div>
				{/each}
			</div>
		{/if}
	</div>
</section>
