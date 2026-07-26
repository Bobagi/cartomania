<script lang="ts">
	import BackButton from '$lib/components/BackButton.svelte';
	import { t } from '$lib/i18n';
	import '../mainpage.css';

	let emailInputValue = '';
	let submitting = false;
	let done = false;

	async function handleSubmit() {
		submitting = true;
		try {
			// Public endpoint via the proxy; always returns ok (never reveals if the
			// email exists), so we always show the same confirmation.
			await fetch('/api/cartomania/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: emailInputValue.trim() })
			});
		} catch {
			// swallow - we still show the neutral confirmation
		} finally {
			submitting = false;
			done = true;
		}
	}
</script>

<div class="page-shell">
	<section class="content-panel">
		<header class="panel-header">
			<h1 class="panel-title">{$t('forgot.title')}</h1>
			<p class="health-text">{$t('forgot.subtitle')}</p>
		</header>

		{#if done}
			<p class="empty-text">{$t('forgot.sent')}</p>
			<div class="auth-actions stacked">
				<BackButton href="/#login" label={$t('forgot.backToLogin')} />
			</div>
		{:else}
			<form class="controls-col auth-col" on:submit|preventDefault={handleSubmit}>
				<div class="auth-fields">
					<label class="input-wrap">
						<span class="input-label">{$t('forgot.email')}</span>
						<input
							class="input-field"
							type="email"
							bind:value={emailInputValue}
							placeholder={$t('forgot.emailPlaceholder')}
							autocomplete="email"
							required
						/>
					</label>
				</div>
				<div class="auth-actions stacked">
					<button class="button button-primary" type="submit" disabled={submitting}>
						{$t('forgot.submit')}
					</button>
					<BackButton href="/#login" label={$t('forgot.backToLogin')} />
				</div>
			</form>
		{/if}
	</section>
</div>
