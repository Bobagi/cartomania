<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import GoogleAuthButton from '$lib/components/GoogleAuthButton.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import { t } from '$lib/i18n';
	import '../mainpage.css';

	let usernameInputValue = '';
	let passwordInputValue = '';
	let confirmPasswordInputValue = '';
	let acceptTermsChecked = false;
	let registrationErrorKey: string | null = null;
	let submitting = false;

	async function handleRegister() {
		registrationErrorKey = null;
		if (!usernameInputValue.trim()) {
			registrationErrorKey = 'register.errors.usernameRequired';
			return;
		}
		if (passwordInputValue.length < 8) {
			registrationErrorKey = 'register.errors.passwordTooShort';
			return;
		}
		if (passwordInputValue !== confirmPasswordInputValue) {
			registrationErrorKey = 'register.errors.passwordMismatch';
			return;
		}
		if (!acceptTermsChecked) {
			registrationErrorKey = 'register.errors.termsRequired';
			return;
		}

		submitting = true;
		try {
			const response = await fetch('/api/auth/register', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: usernameInputValue.trim(),
					password: passwordInputValue,
					acceptTerms: acceptTermsChecked
				})
			});
			if (!response.ok) {
				const data = await response.json().catch(() => null);
				registrationErrorKey =
					response.status === 400 && typeof data?.message === 'string' && data.message
						? null
						: 'register.errors.generic';
				if (registrationErrorKey === null) registrationServerMessage = data?.message ?? '';
				return;
			}
			await invalidateAll();
			goto('/');
		} catch (error) {
			console.error(error);
			registrationErrorKey = 'register.errors.generic';
		} finally {
			submitting = false;
		}
	}

	let registrationServerMessage = '';
</script>

<div class="page-shell">
	<section class="content-panel">
		<header class="panel-header">
			<h1 class="panel-title">{$t('register.title')}</h1>
			<p class="health-text">{$t('register.subtitle')}</p>
		</header>

		<form class="controls-col auth-col" on:submit|preventDefault={handleRegister}>
			<div class="auth-fields">
				<label class="input-wrap">
					<span class="input-label">{$t('register.username')}</span>
					<input
						class="input-field"
						bind:value={usernameInputValue}
						placeholder={$t('register.usernamePlaceholder')}
						autocomplete="username"
					/>
				</label>

				<label class="input-wrap">
					<span class="input-label">{$t('register.password')}</span>
					<input
						class="input-field"
						type="password"
						bind:value={passwordInputValue}
						placeholder="••••••••"
						autocomplete="new-password"
					/>
				</label>

				<label class="input-wrap">
					<span class="input-label">{$t('register.confirmPassword')}</span>
					<input
						class="input-field"
						type="password"
						bind:value={confirmPasswordInputValue}
						placeholder="••••••••"
						autocomplete="new-password"
					/>
				</label>
			</div>

			<label class="terms-check">
				<input type="checkbox" bind:checked={acceptTermsChecked} />
				<span>
					{$t('register.terms.prefix')}
					<a href="/terms" target="_blank" rel="noopener">{$t('register.terms.terms')}</a>
					{$t('register.terms.and')}
					<a href="/privacy" target="_blank" rel="noopener">{$t('register.terms.privacy')}</a>.
				</span>
			</label>

			<div class="auth-actions stacked">
				<button class="button button-primary" type="submit" disabled={submitting}>
					{$t('register.submit')}
				</button>
				<BackButton href="/" label={$t('register.back')} />
			</div>
		</form>

		<div class="auth-divider">{$t('home.auth.or')}</div>
		<GoogleAuthButton />

		{#if registrationErrorKey}
			<p class="empty-text" style="color:#ffbdbd">{$t(registrationErrorKey)}</p>
		{:else if registrationServerMessage}
			<p class="empty-text" style="color:#ffbdbd">{registrationServerMessage}</p>
		{/if}
	</section>
</div>

<style>
	.terms-check {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin: 4px 2px 2px;
		font-size: 13.5px;
		line-height: 1.5;
		color: var(--muted, #cdbb8f);
		text-align: left;
	}
	.terms-check input[type='checkbox'] {
		margin-top: 3px;
		width: 16px;
		height: 16px;
		flex: 0 0 auto;
		accent-color: var(--accent, #e5b96b);
		cursor: pointer;
	}
	.terms-check a {
		color: var(--accent, #e5b96b);
		text-decoration: underline;
	}
	.terms-check a:hover {
		filter: brightness(1.15);
	}
</style>
