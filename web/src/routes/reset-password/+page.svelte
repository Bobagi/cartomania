<script lang="ts">
	import { page } from '$app/stores';
	import BackButton from '$lib/components/BackButton.svelte';
	import { t } from '$lib/i18n';
	import '../mainpage.css';

	$: token = $page.url.searchParams.get('token') ?? '';

	let passwordInputValue = '';
	let confirmInputValue = '';
	let submitting = false;
	let done = false;
	let errorKey: string | null = null;

	async function handleSubmit() {
		errorKey = null;
		if (passwordInputValue.length < 8) {
			errorKey = 'reset.errors.passwordTooShort';
			return;
		}
		if (passwordInputValue !== confirmInputValue) {
			errorKey = 'reset.errors.mismatch';
			return;
		}
		submitting = true;
		try {
			const response = await fetch('/api/cartomania/auth/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, newPassword: passwordInputValue })
			});
			if (!response.ok) {
				errorKey = 'reset.errors.invalid';
				return;
			}
			done = true;
		} catch {
			errorKey = 'reset.errors.invalid';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="page-shell">
	<section class="content-panel">
		<header class="panel-header">
			<h1 class="panel-title">{$t('reset.title')}</h1>
			<p class="health-text">{$t('reset.subtitle')}</p>
		</header>

		{#if done}
			<p class="empty-text">{$t('reset.done')}</p>
			<div class="auth-actions stacked">
				<BackButton href="/#login" label={$t('reset.goLogin')} />
			</div>
		{:else if !token}
			<p class="empty-text" style="color:#ffbdbd">{$t('reset.errors.noToken')}</p>
			<div class="auth-actions stacked">
				<BackButton href="/forgot-password" label={$t('reset.requestNew')} />
			</div>
		{:else}
			<form class="controls-col auth-col" on:submit|preventDefault={handleSubmit}>
				<div class="auth-fields">
					<label class="input-wrap">
						<span class="input-label">{$t('reset.newPassword')}</span>
						<input
							class="input-field"
							type="password"
							bind:value={passwordInputValue}
							placeholder="••••••••"
							autocomplete="new-password"
						/>
					</label>
					<label class="input-wrap">
						<span class="input-label">{$t('reset.confirm')}</span>
						<input
							class="input-field"
							type="password"
							bind:value={confirmInputValue}
							placeholder="••••••••"
							autocomplete="new-password"
						/>
					</label>
				</div>
				<div class="auth-actions stacked">
					<button class="button button-primary" type="submit" disabled={submitting}>
						{$t('reset.submit')}
					</button>
				</div>
			</form>
			{#if errorKey}
				<p class="empty-text" style="color:#ffbdbd">{$t(errorKey)}</p>
			{/if}
		{/if}
	</section>
</div>
