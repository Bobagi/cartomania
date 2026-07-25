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
			{:else}
				<!-- Quick access to the login panel at the bottom of the landing (works from
					any page via the /#login anchor); stays a quiet ghost so it doesn't compete
					with the hero's "Play" call to action. -->
				<a class="button button-ghost topbar-login" href="/#login">{$t('nav.login')}</a>
			{/if}
		</nav>
	</div>
</header>
