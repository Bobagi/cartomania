<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { t } from '$lib/i18n';

	/** When set, the button renders as a link to this route (defaults to the profile/home). */
	export let href: string | null = '/';
	/** Optional explicit label; defaults to the shared "Back" string. */
	export let label: string | null = null;
	/** Lifts the button onto its own translucent backdrop for chromeless full-bleed screens. */
	export let floating = false;

	const dispatch = createEventDispatcher<{ click: void }>();

	$: text = label ?? $t('common.back');
</script>

{#if href}
	<a class="back-button" class:back-button--floating={floating} {href} aria-label={text} on:click>
		<span class="back-button__icon" aria-hidden="true">←</span>
		<span class="back-button__label">{text}</span>
	</a>
{:else}
	<button
		type="button"
		class="back-button"
		class:back-button--floating={floating}
		aria-label={text}
		on:click={() => dispatch('click')}
	>
		<span class="back-button__icon" aria-hidden="true">←</span>
		<span class="back-button__label">{text}</span>
	</button>
{/if}

<style>
	/* Shared "back" control — modelled on the Friends panel's ghost pill so every
	   screen's back affordance looks identical (rounded pill, muted → gold on hover). */
	.back-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 16px;
		border-radius: 999px;
		font-family: inherit;
		font-size: 13px;
		font-weight: 700;
		letter-spacing: 0.02em;
		color: var(--muted, #97a3ba);
		background: var(--surface-2, rgba(13, 17, 28, 0.82));
		border: 1px solid var(--border, rgba(160, 172, 210, 0.16));
		cursor: pointer;
		text-decoration: none;
		white-space: nowrap;
		transition:
			color 0.15s ease,
			background 0.15s ease,
			border-color 0.15s ease,
			transform 0.1s ease;
	}
	.back-button:hover {
		color: var(--gold-1, #ffe7a6);
		background: var(--surface-3, rgba(28, 35, 52, 0.6));
		border-color: var(--gold-2, #e7b24a);
	}
	.back-button:active {
		transform: translateY(1px);
	}
	.back-button__icon {
		font-size: 16px;
		line-height: 1;
		transition: transform 0.15s ease;
	}
	.back-button:hover .back-button__icon {
		transform: translateX(-2px);
	}

	/* Floating variant for chromeless full-bleed screens (e.g. /cards-lab). */
	.back-button--floating {
		position: absolute;
		top: 18px;
		left: 18px;
		z-index: 50;
		background: rgba(10, 12, 20, 0.62);
		backdrop-filter: blur(6px);
		box-shadow: 0 12px 30px -16px rgba(0, 0, 0, 0.85);
	}
</style>
