<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import {
		SITE_DESCRIPTION,
		SITE_NAME,
		SITE_PREVIEW_IMAGE,
		SITE_URL,
		SOCIAL_LINKS
	} from '$lib/config/siteMetadata';
	import { initLocale } from '$lib/i18n';
	import type { Locale } from '$lib/i18n/config';
	import { authUser, clearAuthState, setAuthState } from '$lib/stores/authStore';
	import type { AuthenticatedCartomaniaUser } from '$lib/types/cartomania';
	import '$lib/styles/appShell.css';
	import '../app.postcss';

	export let data: { authUser: AuthenticatedCartomaniaUser | null; locale: Locale };

	// Keep the i18n store in sync with the locale the server resolved (cookie or
	// Accept-Language). Runs during SSR and on every client navigation.
	$: initLocale(data.locale);

	$: canonicalUrl = $page.url?.href ?? SITE_URL;
	// Game routes are a full-screen, chromeless experience (the board owns the
	// viewport); the global top bar/footer would only overlap and waste height.
	$: isGameRoute = ($page.url?.pathname ?? '').startsWith('/game/');

	$: structuredData = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: SITE_NAME,
		url: canonicalUrl,
		description: SITE_DESCRIPTION,
		logo: SITE_PREVIEW_IMAGE,
		sameAs: SOCIAL_LINKS.map((p) => p.url)
	};

	$: setAuthState(data?.authUser ?? null);

	async function handleLogout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		clearAuthState();
		await invalidateAll();
	}
</script>

<svelte:head>
	<meta name="description" content={SITE_DESCRIPTION} />
	<meta property="og:title" content={SITE_NAME} />
	<meta property="og:description" content={SITE_DESCRIPTION} />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={canonicalUrl} />
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:image" content={SITE_PREVIEW_IMAGE} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={SITE_NAME} />
	<meta name="twitter:description" content={SITE_DESCRIPTION} />
	<meta name="twitter:image" content={SITE_PREVIEW_IMAGE} />

	{@html `
		<script type="application/ld+json">
		${JSON.stringify(structuredData).replace(/</g, '\\u003c')}
		</script>
	`}
</svelte:head>

{#if !isGameRoute}
	<TopBar
		isUserAuthenticated={$authUser !== null}
		on:logout={handleLogout}
		on:openFriends={() => {}}
	/>
{/if}

<slot />

{#if !isGameRoute}
	<SiteFooter />
{/if}

<style src="../app.postcss"></style>
