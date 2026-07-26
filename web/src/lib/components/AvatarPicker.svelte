<script lang="ts">
	import { AVATAR_OPTIONS } from '$lib/config/avatarOptions';
	import { t } from '$lib/i18n';
	import type { AuthenticatedCartomaniaUser } from '$lib/types/cartomania';
	import { createEventDispatcher } from 'svelte';

	export let currentAvatarUrl: string | null = null;
	export let googleAvatarUrl: string | null = null;

	const dispatch = createEventDispatcher<{
		close: void;
		updated: { user: AuthenticatedCartomaniaUser };
	}>();
	let saving = false;
	let errorText = '';

	// If the account has a Google profile picture, offer it as a pick (first), so a
	// user who switched to card art can always go back to their Google photo. It is
	// kept separate from `avatarUrl` (the current choice) on the backend.
	$: options =
		googleAvatarUrl && !AVATAR_OPTIONS.includes(googleAvatarUrl)
			? [googleAvatarUrl, ...AVATAR_OPTIONS]
			: AVATAR_OPTIONS;

	async function choose(url: string) {
		if (saving) return;
		saving = true;
		errorText = '';
		try {
			const response = await fetch('/api/auth/avatar', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ avatarUrl: url })
			});
			if (!response.ok) throw new Error('failed');
			const data = (await response.json()) as { user: AuthenticatedCartomaniaUser };
			dispatch('updated', { user: data.user });
			dispatch('close');
		} catch {
			errorText = $t('account.genericError');
		} finally {
			saving = false;
		}
	}
</script>

<div
	class="avatar-modal-backdrop"
	role="button"
	tabindex="0"
	on:click|self={() => dispatch('close')}
	on:keydown={(e) => e.key === 'Escape' && dispatch('close')}
>
	<div class="avatar-modal" role="dialog" aria-modal="true" aria-label={$t('account.chooseAvatar')}>
		<header class="avatar-modal-head">
			<h2>{$t('account.chooseAvatar')}</h2>
			<button
				type="button"
				class="avatar-close"
				on:click={() => dispatch('close')}
				aria-label={$t('account.cancel')}>×</button
			>
		</header>
		{#if errorText}<p class="avatar-error">{errorText}</p>{/if}
		<div class="avatar-grid">
			{#each options as url (url)}
				<button
					type="button"
					class="avatar-option"
					class:active={url === currentAvatarUrl}
					class:is-google={url === googleAvatarUrl}
					disabled={saving}
					on:click={() => choose(url)}
					title={url === googleAvatarUrl ? $t('account.googlePhoto') : undefined}
				>
					<img
						src={url}
						alt={url === googleAvatarUrl ? $t('account.googlePhoto') : ''}
						referrerpolicy="no-referrer"
						loading="lazy"
						decoding="async"
					/>
					{#if url === googleAvatarUrl}<span class="avatar-badge">G</span>{/if}
				</button>
			{/each}
		</div>
	</div>
</div>

<style>
	.avatar-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: clamp(14px, 3vw, 28px);
		background: rgba(5, 7, 12, 0.86);
		backdrop-filter: blur(8px);
		animation: friends-fade 0.2s ease both;
	}
	.avatar-modal {
		width: min(560px, 96vw);
		max-height: 88vh;
		overflow-y: auto;
		padding: clamp(18px, 2.4vw, 28px);
		border-radius: var(--radius);
		border: 1px solid var(--border-strong);
		background: linear-gradient(160deg, rgba(24, 29, 44, 0.98), rgba(11, 15, 25, 0.99));
		box-shadow: var(--shadow);
	}
	.avatar-modal-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}
	.avatar-modal-head h2 {
		margin: 0;
		font-family: var(--font-display);
		font-size: clamp(1.3rem, 3vw, 1.7rem);
		color: var(--heading);
	}
	.avatar-close {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		border: 1px solid var(--border-soft);
		background: rgba(255, 255, 255, 0.08);
		color: var(--text);
		font-size: 20px;
		cursor: pointer;
	}
	.avatar-error {
		margin: 0 0 12px;
		color: #ffbdbd;
		font-size: 14px;
	}
	.avatar-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
		gap: 12px;
	}
	.avatar-option {
		position: relative;
		aspect-ratio: 1;
		padding: 0;
		border-radius: 50%;
		overflow: hidden;
		cursor: pointer;
		border: 2px solid var(--border-soft);
		background: #0c1018;
		transition:
			transform 0.15s ease,
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}
	.avatar-option.is-google {
		border-color: rgba(66, 133, 244, 0.7);
	}
	.avatar-badge {
		position: absolute;
		right: 2px;
		bottom: 2px;
		width: 18px;
		height: 18px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: #fff;
		color: #4285f4;
		font-size: 11px;
		font-weight: 800;
		line-height: 1;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
	}
	.avatar-option:hover:not(:disabled) {
		transform: translateY(-3px);
		border-color: var(--border-strong);
	}
	.avatar-option.active {
		border-color: var(--gold-2);
		box-shadow: 0 0 0 3px rgba(231, 178, 74, 0.35);
	}
	.avatar-option:disabled {
		opacity: 0.6;
		cursor: progress;
	}
	.avatar-option img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		object-position: center 22%;
		display: block;
	}
</style>
