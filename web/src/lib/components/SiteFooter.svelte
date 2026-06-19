<script lang="ts">
	import { SOCIAL_LINKS } from '$lib/config/siteMetadata';
	import { t } from '$lib/i18n';
	const currentYear = new Date().getFullYear();
</script>

<footer class="site-footer" aria-label="Cartomania site footer">
	<div class="footer-inner footer-grid">
		<div class="footer-brand">
			<h2 class="footer-title">Cartomania</h2>
			<p class="footer-tagline">{$t('footer.tagline')}</p>
		</div>

		<nav class="footer-nav" aria-label={$t('footer.community')}>
			<h3 class="footer-subtitle">{$t('footer.community')}</h3>
			<ul class="social-links">
				{#each SOCIAL_LINKS as link}
					<li><a href={link.url} target="_blank" rel="noopener noreferrer">{link.label}</a></li>
				{/each}
			</ul>
		</nav>
	</div>

	<p class="footer-fanmade">{$t('footer.fanMade')}</p>

	<div class="footer-legal">
		<p class="legal-text">{$t('footer.rights', { year: currentYear })}</p>
		<ul class="legal-links">
			<li><a href="/privacy">{$t('footer.privacy')}</a></li>
			<li><a href="/terms">{$t('footer.terms')}</a></li>
		</ul>
	</div>
</footer>
