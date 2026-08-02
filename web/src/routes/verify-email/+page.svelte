<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import BackButton from '$lib/components/BackButton.svelte';
	import { t } from '$lib/i18n';
	import '../mainpage.css';

	let state: 'working' | 'ok' | 'error' = 'working';

	onMount(async () => {
		const token = $page.url.searchParams.get('token') ?? '';
		if (!token) {
			state = 'error';
			return;
		}
		try {
			const response = await fetch('/api/cartomania/auth/verify-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token })
			});
			state = response.ok ? 'ok' : 'error';
			if (response.ok) await invalidateAll();
		} catch {
			state = 'error';
		}
	});
</script>

<div class="page-shell">
	<section class="content-panel">
		<header class="panel-header">
			<h1 class="panel-title">{$t('verify.title')}</h1>
		</header>

		{#if state === 'working'}
			<p class="empty-text">{$t('verify.working')}</p>
		{:else if state === 'ok'}
			<p class="empty-text">{$t('verify.ok')}</p>
			<div class="auth-actions stacked">
				<BackButton href="/" label={$t('verify.goHome')} />
			</div>
		{:else}
			<p class="empty-text" style="color:#ffbdbd">{$t('verify.error')}</p>
			<div class="auth-actions stacked">
				<BackButton href="/account" label={$t('verify.goAccount')} />
			</div>
		{/if}
	</section>
</div>
