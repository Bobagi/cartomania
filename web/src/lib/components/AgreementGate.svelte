<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { t } from '$lib/i18n';

	// Shown to a signed-in user who has not accepted the Terms/Privacy version in
	// force (a legacy account, a Google sign-in, or after a version bump). Blocking:
	// consent is recorded server-side (append-only) before the app is usable.
	let submitting = false;
	let errored = false;

	async function accept() {
		submitting = true;
		errored = false;
		try {
			const response = await fetch('/api/auth/accept-terms', { method: 'POST' });
			if (!response.ok) throw new Error('accept failed');
			await invalidateAll();
		} catch {
			errored = true;
		} finally {
			submitting = false;
		}
	}
</script>

<div class="gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
	<div class="gate-card">
		<h2 id="gate-title" class="gate-title">{$t('agreement.title')}</h2>
		<p class="gate-text">
			{$t('agreement.body.prefix')}
			<a href="/terms" target="_blank" rel="noopener">{$t('agreement.body.terms')}</a>
			{$t('agreement.body.and')}
			<a href="/privacy" target="_blank" rel="noopener">{$t('agreement.body.privacy')}</a>{$t(
				'agreement.body.suffix'
			)}
		</p>
		{#if errored}
			<p class="gate-error" role="alert">{$t('agreement.error')}</p>
		{/if}
		<button class="button button-accent gate-btn" on:click={accept} disabled={submitting}>
			{submitting ? $t('agreement.accepting') : $t('agreement.accept')}
		</button>
	</div>
</div>

<style>
	.gate-backdrop {
		position: fixed;
		inset: 0;
		z-index: 4000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		background: rgba(6, 5, 12, 0.82);
		backdrop-filter: blur(4px);
	}
	.gate-card {
		width: min(460px, 100%);
		border: 1px solid rgba(229, 185, 107, 0.35);
		border-radius: 16px;
		background: linear-gradient(180deg, #1a1626, #12101b);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
		padding: 26px 24px;
		text-align: center;
	}
	.gate-title {
		margin: 0 0 12px;
		font-family: var(--font-display, inherit);
		font-size: 22px;
		color: #f2e4c4;
	}
	.gate-text {
		margin: 0 0 18px;
		font-size: 14.5px;
		line-height: 1.6;
		color: #d9cba6;
	}
	.gate-text a {
		color: var(--accent, #e5b96b);
		text-decoration: underline;
	}
	.gate-error {
		margin: 0 0 12px;
		font-size: 13px;
		color: #ffb4b4;
	}
	.gate-btn {
		width: 100%;
	}
</style>
