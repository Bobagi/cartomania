<script lang="ts">
	import { goto } from '$app/navigation';
	import { loginCartomaniaUserAccount, registerCartomaniaUserAccount } from '$lib/api/GameClient';
	import GoogleAuthButton from '$lib/components/GoogleAuthButton.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import { t } from '$lib/i18n';
	import '../mainpage.css';

	let usernameInputValue = '';
	let passwordInputValue = '';
	let confirmPasswordInputValue = '';
	let registrationErrorKey: string | null = null;

	async function handleRegister() {
		registrationErrorKey = null;
		if (!usernameInputValue.trim()) {
			registrationErrorKey = 'register.errors.usernameRequired';
			return;
		}
		if (!passwordInputValue) {
			registrationErrorKey = 'register.errors.passwordRequired';
			return;
		}
		if (passwordInputValue !== confirmPasswordInputValue) {
			registrationErrorKey = 'register.errors.passwordMismatch';
			return;
		}

		try {
			await registerCartomaniaUserAccount(usernameInputValue.trim(), passwordInputValue);
			await loginCartomaniaUserAccount(usernameInputValue.trim(), passwordInputValue);
			goto('/');
		} catch (error) {
			console.error(error);
			registrationErrorKey = 'register.errors.generic';
		}
	}
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

			<div class="auth-actions stacked">
				<button class="button button-accent" type="submit">{$t('register.submit')}</button>
				<BackButton href="/" label={$t('register.back')} />
			</div>
		</form>

		<div class="auth-divider">{$t('home.auth.or')}</div>
		<GoogleAuthButton />

		{#if registrationErrorKey}
			<p class="empty-text" style="color:#ffbdbd">{$t(registrationErrorKey)}</p>
		{/if}
	</section>
</div>
