<script lang="ts">
	import { assets } from '$app/paths';
	import { t } from '$lib/i18n';
	import { createEventDispatcher } from 'svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	export let isUserAuthenticated: boolean = false;
	const dispatch = createEventDispatcher();

	function requestLogout() {
		dispatch('logout');
	}
	const brandLogoUrl = `${assets}/cartomania-icon.png`;
</script>

<header class="site-topbar" aria-label="Cartomania top bar">
	<div class="topbar-inner">
		<a href="/" class="brand-link">
			<img class="brand-logo" src={brandLogoUrl} alt="Cartomania" />
			<span class="brand-name">Cartomania</span>
		</a>
		<nav class="topbar-nav" aria-label="Primary">
			<LanguageSelector />
			{#if isUserAuthenticated}
				<button type="button" class="button button-primary" on:click={requestLogout}>
					{$t('nav.logout')}
				</button>
			{/if}
		</nav>
	</div>
</header>
