<script lang="ts">
	import { env } from '$env/dynamic/public';
	import { t } from '$lib/i18n';

	// Groundwork: the button is visible now but only performs the real OAuth
	// redirect once PUBLIC_GOOGLE_AUTH_ENABLED=true (and the backend/credentials
	// are wired up - see CLAUDE.md). Until then a click shows a "coming soon" hint.
	const googleEnabled = env.PUBLIC_GOOGLE_AUTH_ENABLED === 'true';
	let showComingSoon = false;

	function handleClick(event: MouseEvent) {
		if (!googleEnabled) {
			event.preventDefault();
			showComingSoon = true;
		}
	}
</script>

<a class="google-btn" href="/auth/google" role="button" on:click={handleClick}>
	<svg class="g-logo" viewBox="0 0 48 48" aria-hidden="true">
		<path
			fill="#EA4335"
			d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
		/>
		<path
			fill="#4285F4"
			d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
		/>
		<path
			fill="#FBBC05"
			d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
		/>
		<path
			fill="#34A853"
			d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
		/>
	</svg>
	<span>{$t('auth.googleContinue')}</span>
</a>
{#if showComingSoon}
	<p class="google-hint" role="status">{$t('auth.googleComingSoon')}</p>
{/if}

<style>
	.google-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		width: 100%;
		padding: 11px 16px;
		border-radius: var(--radius-sm);
		background: #fff;
		color: #1f2329;
		font-weight: 600;
		font-size: 14px;
		text-decoration: none;
		border: 1px solid rgba(0, 0, 0, 0.14);
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
		transition:
			filter 0.15s ease,
			transform 0.1s ease;
	}
	.google-btn:hover {
		filter: brightness(0.97);
	}
	.google-btn:active {
		transform: translateY(1px);
	}
	.g-logo {
		width: 18px;
		height: 18px;
		flex: 0 0 auto;
	}
	.google-hint {
		margin: 8px 0 0;
		text-align: center;
		font-size: 12.5px;
		color: var(--muted);
	}
</style>
