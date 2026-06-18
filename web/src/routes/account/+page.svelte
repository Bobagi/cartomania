<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { t } from '$lib/i18n';
	import BackButton from '$lib/components/BackButton.svelte';
	import { clearAuthState, setAuthState } from '$lib/stores/authStore';
	import type { AuthenticatedCartomaniaUser } from '$lib/types/cartomania';
	import '../mainpage.css';
	import './account.css';

	export let data: { user: AuthenticatedCartomaniaUser };

	let newUsername = data.user.username;
	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';
	let confirmingDelete = false;
	let busy = false;

	let usernameMsg = '';
	let usernameErr = '';
	let passwordMsg = '';
	let passwordErr = '';
	let deleteErr = '';

	async function postJson(path: string, body: unknown): Promise<Record<string, unknown>> {
		const response = await fetch(path, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body ?? {})
		});
		if (!response.ok) {
			const errorBody = (await response.json().catch(() => ({}))) as { message?: string };
			throw new Error(errorBody?.message || $t('account.genericError'));
		}
		return (await response.json().catch(() => ({}))) as Record<string, unknown>;
	}

	async function submitUsername() {
		usernameMsg = '';
		usernameErr = '';
		busy = true;
		try {
			const { user } = await postJson('/api/auth/username', { username: newUsername.trim() });
			setAuthState(user as AuthenticatedCartomaniaUser);
			usernameMsg = $t('account.usernameUpdated');
			await invalidateAll();
		} catch (error) {
			usernameErr = (error as Error).message;
		} finally {
			busy = false;
		}
	}

	async function submitPassword() {
		passwordMsg = '';
		passwordErr = '';
		if (newPassword !== confirmPassword) {
			passwordErr = $t('account.passwordsDoNotMatch');
			return;
		}
		busy = true;
		try {
			await postJson('/api/auth/password', { currentPassword, newPassword });
			passwordMsg = $t('account.passwordUpdated');
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (error) {
			passwordErr = (error as Error).message;
		} finally {
			busy = false;
		}
	}

	async function deleteAccount() {
		deleteErr = '';
		busy = true;
		try {
			await postJson('/api/auth/delete', {});
			clearAuthState();
			await goto('/');
		} catch (error) {
			deleteErr = (error as Error).message;
			busy = false;
		}
	}
</script>

<svelte:head>
	<meta name="description" content="Account settings" />
</svelte:head>

<div class="page-shell">
	<section class="content-panel account-panel">
		<BackButton href="/" label={$t('account.back')} />
		<header class="panel-header">
			<h1 class="panel-title">{$t('account.title')}</h1>
		</header>

		<div class="account-card">
			<h2>{$t('account.usernameTitle')}</h2>
			<p class="account-hint">{$t('account.usernameHint')}</p>
			<form class="account-form" on:submit|preventDefault={submitUsername}>
				<label class="input-wrap">
					<span class="input-label">{$t('account.newUsername')}</span>
					<input class="input-field" bind:value={newUsername} autocomplete="username" />
				</label>
				<button class="button button-primary" type="submit" disabled={busy}>
					{$t('account.changeUsername')}
				</button>
			</form>
			{#if usernameMsg}<p class="account-ok">{usernameMsg}</p>{/if}
			{#if usernameErr}<p class="account-err">{usernameErr}</p>{/if}
		</div>

		<div class="account-card">
			<h2>{$t('account.passwordTitle')}</h2>
			<form class="account-form" on:submit|preventDefault={submitPassword}>
				<label class="input-wrap">
					<span class="input-label">{$t('account.currentPassword')}</span>
					<input
						class="input-field"
						type="password"
						bind:value={currentPassword}
						autocomplete="current-password"
					/>
				</label>
				<label class="input-wrap">
					<span class="input-label">{$t('account.newPassword')}</span>
					<input
						class="input-field"
						type="password"
						bind:value={newPassword}
						autocomplete="new-password"
					/>
				</label>
				<label class="input-wrap">
					<span class="input-label">{$t('account.confirmNewPassword')}</span>
					<input
						class="input-field"
						type="password"
						bind:value={confirmPassword}
						autocomplete="new-password"
					/>
				</label>
				<button class="button button-primary" type="submit" disabled={busy}>
					{$t('account.changePassword')}
				</button>
			</form>
			{#if passwordMsg}<p class="account-ok">{passwordMsg}</p>{/if}
			{#if passwordErr}<p class="account-err">{passwordErr}</p>{/if}
		</div>

		<div class="account-card danger">
			<h2>{$t('account.dangerTitle')}</h2>
			<p class="account-hint">{$t('account.deleteWarning')}</p>
			{#if !confirmingDelete}
				<button
					class="button button-danger"
					type="button"
					on:click={() => (confirmingDelete = true)}
				>
					{$t('account.deleteAccount')}
				</button>
			{:else}
				<div class="delete-confirm">
					<button
						class="button button-danger"
						type="button"
						disabled={busy}
						on:click={deleteAccount}
					>
						{$t('account.deleteConfirm')}
					</button>
					<button
						class="button button-ghost"
						type="button"
						on:click={() => (confirmingDelete = false)}
					>
						{$t('account.cancel')}
					</button>
				</div>
			{/if}
			{#if deleteErr}<p class="account-err">{deleteErr}</p>{/if}
		</div>
	</section>
</div>
