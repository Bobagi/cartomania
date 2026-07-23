<script lang="ts">
	import { acceptAll, acceptEssential, consent } from '$lib/consent/consent';
	import { t } from '$lib/i18n';

	// Measured once the bar is in the DOM; the spacer's CSS height covers SSR and
	// the first paint until this lands.
	let bannerHeight = 0;
</script>

{#if !$consent.decided}
	<!-- Reserve the bar's height at the end of the page flow so this fixed bar never
		covers the content underneath it (it used to hide the whole login card on
		phones). Both the spacer and the bar disappear once a choice is made. -->
	<div
		class="cookie-spacer"
		aria-hidden="true"
		style:height={bannerHeight ? `${bannerHeight}px` : null}
	></div>
	<!-- Non-blocking consent bar: a labelled landmark (not a modal — it traps no
		focus and the page stays usable behind it). -->
	<div
		class="cookie-banner"
		role="region"
		aria-label={$t('consent.ariaLabel')}
		bind:clientHeight={bannerHeight}
	>
		<div class="cookie-inner">
			<div class="cookie-copy">
				<p class="cookie-title">{$t('consent.title')}</p>
				<p class="cookie-text">
					{$t('consent.message')}
					<a class="cookie-link" href="/privacy">{$t('consent.privacyLink')}</a>
				</p>
			</div>
			<div class="cookie-actions">
				<button type="button" class="button button-ghost cookie-btn" on:click={acceptEssential}>
					{$t('consent.essentialOnly')}
				</button>
				<button type="button" class="button button-primary cookie-btn" on:click={acceptAll}>
					{$t('consent.acceptAll')}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	/* SSR / first-paint fallback heights (the bar wraps to more lines as the
	   viewport narrows); replaced by the measured height on hydration. */
	.cookie-spacer {
		height: 210px;
	}
	@media (min-width: 561px) {
		.cookie-spacer {
			height: 150px;
		}
	}
	@media (min-width: 900px) {
		.cookie-spacer {
			height: 118px;
		}
	}

	.cookie-banner {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 4000; /* above the duel hand (~999) and friends dock (220) */
		padding: 14px clamp(12px, 4vw, 28px) calc(14px + env(safe-area-inset-bottom, 0px));
		background: var(--surface-2, rgba(13, 17, 28, 0.82));
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-top: 1px solid var(--border-strong, rgba(214, 178, 92, 0.5));
		box-shadow: 0 -14px 40px rgba(0, 0, 0, 0.5);
		animation: cookie-rise 0.32s ease-out both;
	}

	@keyframes cookie-rise {
		from {
			transform: translateY(100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	.cookie-inner {
		max-width: 1100px;
		margin: 0 auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 14px 24px;
	}

	.cookie-copy {
		flex: 1 1 360px;
		min-width: 0;
	}

	.cookie-title {
		margin: 0 0 4px;
		font-weight: 700;
		font-size: 0.98rem;
		color: var(--heading, #f7f2e6);
	}

	.cookie-text {
		margin: 0;
		font-size: 0.86rem;
		line-height: 1.45;
		color: var(--muted, #97a3ba);
	}

	.cookie-link {
		color: var(--gold-1, #ffe7a6);
		text-decoration: underline;
		text-underline-offset: 2px;
		white-space: nowrap;
	}
	.cookie-link:focus-visible {
		outline: none;
		box-shadow: var(--ring, 0 0 0 3px rgba(233, 184, 78, 0.3));
		border-radius: 4px;
	}

	.cookie-actions {
		display: flex;
		gap: 10px;
		flex: 0 0 auto;
		flex-wrap: wrap;
	}

	.cookie-btn {
		min-width: 132px;
		justify-content: center;
	}

	@media (max-width: 560px) {
		.cookie-actions {
			width: 100%;
		}
		.cookie-btn {
			flex: 1 1 0;
			min-width: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.cookie-banner {
			animation: none;
		}
	}
</style>
