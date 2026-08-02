<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { t, td } from '$lib/i18n';
	import { clearAuthState } from '$lib/stores/authStore';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';

	// Blocking consent gate. Shown over the whole app whenever the signed-in user has
	// NOT accepted the Terms/Privacy version in force (legacy accounts, Google sign-ins,
	// or after a version bump). Until they accept, they can only ACCEPT or SIGN OUT, so
	// nobody reaches the game without an on-record, server-side acceptance.
	export let version = '';

	type LegalItem = { strong: string; text: string };
	type LegalSection = { heading: string; paragraphs: string[]; items: LegalItem[] };
	type LegalDoc = { title: string; intro: string; sections: LegalSection[] };

	// The full Terms are rendered inline (scrollable) so the user actually sees what
	// they accept; the Privacy Policy opens in a new tab from the link above.
	$: terms = $td<LegalDoc>('legal.terms');

	// Three separate affirmations, all required, recorded together as one acceptance.
	let agreedAge = false;
	let agreedTerms = false;
	let agreedPrivacy = false;
	let busy = false;
	let errored = false;

	$: allAgreed = agreedAge && agreedTerms && agreedPrivacy;

	async function accept() {
		if (!allAgreed || busy) return;
		busy = true;
		errored = false;
		try {
			const response = await fetch('/api/auth/accept-terms', { method: 'POST' });
			if (!response.ok) throw new Error('accept failed');
			await invalidateAll();
		} catch {
			errored = true;
		} finally {
			busy = false;
		}
	}

	async function declineAndSignOut() {
		if (busy) return;
		busy = true;
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
		} catch {
			// ignore; we still clear the client state
		}
		clearAuthState();
		await goto('/');
		await invalidateAll();
	}
</script>

<div class="gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
	<div class="gate-card">
		<div class="gate-top">
			<h2 id="gate-title" class="gate-title">{$t('agreement.title')}</h2>
			<LanguageSelector />
		</div>

		{#if version}
			<p class="gate-version">{$t('agreement.version', { version })}</p>
		{/if}
		<p class="gate-intro">{$t('agreement.intro')}</p>

		<p class="gate-links">
			<a href="/terms" target="_blank" rel="noopener">{$t('agreement.viewTerms')}</a>
			<span aria-hidden="true">·</span>
			<a href="/privacy" target="_blank" rel="noopener">{$t('agreement.viewPrivacy')}</a>
		</p>

		{#if terms}
			<div class="gate-doc" aria-label={terms.title}>
				<p class="gate-doc-intro">{terms.intro}</p>
				{#each terms.sections as section}
					<h3>{section.heading}</h3>
					{#each section.paragraphs as paragraph}
						<p>{paragraph}</p>
					{/each}
					{#if section.items.length}
						<ul>
							{#each section.items as item}
								<li>
									{#if item.strong}<strong>{item.strong}</strong>:
									{/if}{item.text}
								</li>
							{/each}
						</ul>
					{/if}
				{/each}
			</div>
		{/if}

		<div class="gate-accepts">
			<label class="gate-row">
				<input type="checkbox" bind:checked={agreedAge} />
				<span>{$t('agreement.checkboxAge')}</span>
			</label>
			<label class="gate-row">
				<input type="checkbox" bind:checked={agreedTerms} />
				<span>
					{$t('agreement.checkboxTermsPre')}
					<a href="/terms" target="_blank" rel="noopener">{$t('agreement.termsLabel')}</a>.
				</span>
			</label>
			<label class="gate-row">
				<input type="checkbox" bind:checked={agreedPrivacy} />
				<span>
					{$t('agreement.checkboxPrivacyPre')}
					<a href="/privacy" target="_blank" rel="noopener">{$t('agreement.privacyLabel')}</a>.
				</span>
			</label>
		</div>

		{#if errored}
			<p class="gate-error" role="alert">{$t('agreement.error')}</p>
		{/if}

		<button
			class="button button-primary gate-accept"
			on:click={accept}
			disabled={!allAgreed || busy}
		>
			{busy ? $t('agreement.accepting') : $t('agreement.accept')}
		</button>
		<button type="button" class="gate-decline" on:click={declineAndSignOut} disabled={busy}>
			{$t('agreement.decline')}
		</button>
	</div>
</div>

<style>
	.gate-backdrop {
		position: fixed;
		inset: 0;
		z-index: 4000;
		display: grid;
		place-items: center;
		padding: 16px;
		background: rgba(6, 5, 12, 0.9);
		backdrop-filter: blur(4px);
		overflow-y: auto;
	}
	.gate-card {
		width: 100%;
		max-width: 620px;
		max-height: calc(100dvh - 32px);
		display: flex;
		flex-direction: column;
		border: 1px solid rgba(229, 185, 107, 0.35);
		border-radius: 16px;
		background: linear-gradient(180deg, #1a1626, #12101b);
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
		padding: 22px 22px 20px;
	}
	.gate-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.gate-title {
		margin: 0;
		font-family: var(--font-display, inherit);
		font-size: 22px;
		color: #f2e4c4;
	}
	.gate-version {
		margin: 8px 0 0;
		font-size: 12px;
		color: #8a7c5e;
	}
	.gate-intro {
		margin: 10px 0 0;
		font-size: 14px;
		line-height: 1.6;
		color: #d9cba6;
	}
	.gate-links {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 10px 0 0;
		font-size: 13px;
	}
	.gate-links a {
		color: var(--accent, #e5b96b);
		font-weight: 700;
		text-decoration: underline;
	}
	.gate-doc {
		margin: 14px 0 0;
		max-height: 40vh;
		overflow-y: auto;
		border: 1px solid rgba(229, 185, 107, 0.18);
		border-radius: 12px;
		background: rgba(0, 0, 0, 0.28);
		padding: 14px 16px;
	}
	.gate-doc-intro {
		margin: 0 0 10px;
		color: #cdbb8f;
		font-size: 13px;
		line-height: 1.6;
	}
	.gate-doc h3 {
		margin: 14px 0 4px;
		font-size: 13.5px;
		font-weight: 800;
		color: #e9dcc0;
	}
	.gate-doc h3:first-of-type {
		margin-top: 0;
	}
	.gate-doc p,
	.gate-doc li {
		margin: 4px 0 0;
		color: #b9ab86;
		font-size: 13px;
		line-height: 1.6;
	}
	.gate-doc ul {
		margin: 6px 0 0;
		padding-left: 18px;
	}
	.gate-accepts {
		margin: 16px 0 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.gate-row {
		margin: 0;
		display: flex;
		align-items: flex-start;
		gap: 10px;
		font-size: 13.5px;
		line-height: 1.5;
		color: #d9cba6;
		text-align: left;
		cursor: pointer;
	}
	.gate-row input {
		margin-top: 2px;
		width: 17px;
		height: 17px;
		flex: 0 0 auto;
		accent-color: var(--accent, #e5b96b);
		cursor: pointer;
	}
	.gate-row a {
		color: var(--accent, #e5b96b);
		font-weight: 700;
		text-decoration: underline;
	}
	.gate-error {
		margin: 12px 0 0;
		font-size: 13px;
		color: #ffb4b4;
	}
	.gate-accept {
		width: 100%;
		margin-top: 16px;
	}
	.gate-accept:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.gate-decline {
		display: block;
		margin: 12px auto 0;
		background: transparent;
		border: none;
		color: #9a8c6e;
		font-size: 13.5px;
		min-height: 24px;
		cursor: pointer;
	}
	.gate-decline:hover:not(:disabled) {
		color: #e9dcc0;
		text-decoration: underline;
	}
</style>
