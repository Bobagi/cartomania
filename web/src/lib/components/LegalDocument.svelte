<script lang="ts">
	import { SOCIAL_LINKS } from '$lib/config/siteMetadata';
	import { locale, t, td } from '$lib/i18n';
	import '$lib/styles/routes/legalPage.css';

	export let docKey: 'privacy' | 'terms';

	type LegalItem = { strong: string; text: string };
	type LegalSection = { heading: string; paragraphs: string[]; items: LegalItem[] };
	type LegalDoc = {
		title: string;
		intro: string;
		contactHeading: string;
		contactText: string;
		sections: LegalSection[];
	};

	const lastUpdatedDate = new Date(2026, 5, 26); // 26 June 2026 (month is 0-indexed)
	const githubUrl =
		SOCIAL_LINKS.find((link) => link.label === 'GitHub')?.url ??
		'https://github.com/bobagi/cartomania';

	// Format the "last updated" date in the active language (e.g. "7 de junho de 2026").
	$: lastUpdated = lastUpdatedDate.toLocaleDateString($locale, {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	$: doc = $td<LegalDoc>(`legal.${docKey}`);
</script>

<svelte:head>
	<meta name="description" content={doc?.intro ?? ''} />
</svelte:head>

{#if doc}
	<div class="legal-page">
		<a class="legal-back" href="/">← {$t('legal.back')}</a>
		<p class="legal-kicker">{$t('legal.kicker')}</p>
		<h1>{doc.title}</h1>
		<p class="legal-updated">{$t('legal.updated', { date: lastUpdated })}</p>

		<div class="legal-card">
			<p>{doc.intro}</p>

			{#each doc.sections as section}
				<h2>{section.heading}</h2>
				{#each section.paragraphs as paragraph}
					<p>{paragraph}</p>
				{/each}
				{#if section.items.length}
					<ul>
						{#each section.items as item}
							<li>
								{#if item.strong}<strong>{item.strong}</strong> —
								{/if}{item.text}
							</li>
						{/each}
					</ul>
				{/if}
			{/each}

			<h2>{doc.contactHeading}</h2>
			<p>
				{doc.contactText}
				<a href={githubUrl} target="_blank" rel="noopener noreferrer">{$t('legal.contactLink')}</a>.
			</p>

			<p class="legal-note">{$t('legal.disclaimer')}</p>
		</div>
	</div>
{/if}
