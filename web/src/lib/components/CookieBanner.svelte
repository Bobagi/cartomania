<script lang="ts">
	import { acceptAll, acceptEssential, consent } from '$lib/consent/consent';
	import { t } from '$lib/i18n';
</script>

{#if !$consent.decided}
	<!-- Non-blocking consent bar: a labelled landmark (not a modal — it traps no
		focus and the page stays usable behind it). -->
	<div class="cookie-banner" role="region" aria-label={$t('consent.ariaLabel')}>
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
