<script lang="ts">
	import type { CartomaniaCardCatalogItem, CartomaniaCardCollection } from '$lib/api/GameClient';
	import { fetchCartomaniaCardCatalog } from '$lib/api/GameClient';
	import CardComposite from '$lib/components/CardComposite.svelte';
	import BackButton from '$lib/components/BackButton.svelte';
	import { t } from '$lib/i18n';
	import '$lib/styles/routes/galleryPage.css';
	import { onMount } from 'svelte';
	import '../game/game.css';

	const defaultFrameOverlayImageUrl = '/frames/default.png';
	const titleOverlayImageUrl = '/frames/title.png';
	const defaultCollectionImageUrl = '/icons/logo.png';
	const localCollectionLogoDirectoryPath = '/collection';
	const localCollectionLogoFileExtension = 'png';

	let isLoadingCards = true;
	let errorMessageText: string | null = null;
	let cartomaniaCollections: CartomaniaCardCollection[] = [];
	let selectedCardItem: CartomaniaCardCatalogItem | null = null;

	function getCollectionDisplayName(collection: CartomaniaCardCollection): string {
		return (
			collection.name?.trim() ||
			collection.slug?.trim() ||
			collection.id?.trim() ||
			'Card Collection'
		);
	}

	function resolveAssetUrl(imageUrl?: string | null): string | null {
		if (!imageUrl) {
			return null;
		}
		if (/^https?:\/\//i.test(imageUrl)) {
			return imageUrl;
		}
		if (imageUrl.startsWith('/')) {
			return imageUrl;
		}
		return `/${imageUrl.replace(/^\/+/, '')}`;
	}

	function sanitizeCollectionIdentifier(candidateIdentifier?: string | null): string | null {
		if (!candidateIdentifier) {
			return null;
		}
		const trimmedIdentifier = candidateIdentifier.trim();
		if (!trimmedIdentifier) {
			return null;
		}
		const normalizedIdentifier = trimmedIdentifier
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/[^a-zA-Z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase();
		return normalizedIdentifier || null;
	}

	function extractIdentifierFromImagePath(imagePath?: string | null): string | null {
		if (!imagePath) {
			return null;
		}
		const trimmedPath = imagePath.trim();
		if (!trimmedPath) {
			return null;
		}
		const segments = trimmedPath.split(/[\\/]/);
		const filename = segments[segments.length - 1];
		if (!filename) {
			return null;
		}
		const baseName = filename.split('.').shift();
		if (!baseName) {
			return null;
		}
		return sanitizeCollectionIdentifier(baseName);
	}

	function resolveLocalCollectionLogoImageUrl(collection: CartomaniaCardCollection): string | null {
		const possibleIdentifiers: Array<string | null | undefined> = [
			collection.slug,
			extractIdentifierFromImagePath(collection.imageUrl),
			collection.id,
			collection.name
		];
		for (const identifier of possibleIdentifiers) {
			const sanitizedIdentifier = sanitizeCollectionIdentifier(identifier);
			if (sanitizedIdentifier) {
				return `${localCollectionLogoDirectoryPath}/${sanitizedIdentifier}.${localCollectionLogoFileExtension}`;
			}
		}
		return null;
	}

	function getCollectionLogoImageUrl(collection: CartomaniaCardCollection): string {
		return (
			resolveLocalCollectionLogoImageUrl(collection) ??
			resolveAssetUrl(collection.imageUrl) ??
			defaultCollectionImageUrl
		);
	}

	onMount(async () => {
		isLoadingCards = true;
		errorMessageText = null;
		try {
			const data = await fetchCartomaniaCardCatalog();
			cartomaniaCollections = data;
		} catch (e) {
			errorMessageText = (e as Error).message;
		} finally {
			isLoadingCards = false;
		}
	});

	function openCardModal(cardItem: CartomaniaCardCatalogItem) {
		selectedCardItem = cardItem;
	}
	function closeCardModal() {
		selectedCardItem = null;
	}

	// The same three power icons the cards themselves use (wizard hat / shield /
	// fireball), instead of emoji, for the modal's stat chips.
	$: modalStats = selectedCardItem
		? [
				{
					icon: '/icons/magic_icon.png',
					label: $t('gallery.stats.magic'),
					value: selectedCardItem.magic ?? 0
				},
				{
					icon: '/icons/strength_icon.png',
					label: $t('gallery.stats.might'),
					value: selectedCardItem.might ?? 0
				},
				{
					icon: '/icons/fire_icon.png',
					label: $t('gallery.stats.fire'),
					value: selectedCardItem.fire ?? 0
				}
			]
		: [];
</script>

<svelte:window on:keydown={(e) => e.key === 'Escape' && (selectedCardItem = null)} />

<div class="gallery-panel">
	<header class="panel-header">
		<div style="display: flex; justify-content: space-between; width: 100%;">
			<BackButton href="/" label={$t('gallery.home')} />
			<h1 class="panel-title">{$t('gallery.title')}</h1>
			<span style="min-width: 10vw;"></span>
		</div>
		<p class="panel-sub">{$t('gallery.subtitle')}</p>
	</header>

	{#if isLoadingCards}
		<p class="status">{$t('gallery.loading')}</p>
	{:else if errorMessageText}
		<p class="status error">{$t('gallery.error', { message: errorMessageText })}</p>
	{:else if !cartomaniaCollections.length}
		<p class="status">{$t('gallery.noCollections')}</p>
	{:else}
		{#each cartomaniaCollections as collection (collection.slug ?? collection.id ?? collection.name)}
			<section class="collection">
				<div class="collection-banner">
					<img
						class="gallery-logo"
						src={getCollectionLogoImageUrl(collection)}
						alt={getCollectionDisplayName(collection)}
						loading="lazy"
						decoding="async"
					/>
					<div class="collection-meta">
						<h2 class="collection-name">{getCollectionDisplayName(collection)}</h2>
						{#if collection.description}
							<p class="collection-description">{collection.description}</p>
						{/if}
						<p class="collection-count">
							{$t('gallery.cardCount', { count: collection.cards.length })}
						</p>
					</div>
				</div>
				{#if !collection.cards.length}
					<p class="status">{$t('gallery.noCards')}</p>
				{:else}
					<div class="gallery-grid">
						{#each collection.cards as cardItem (cardItem.code + cardItem.name)}
							<button
								type="button"
								class="card-tile"
								title={cardItem.name}
								on:click={() => openCardModal(cardItem)}
							>
								<div class="card-wrap">
									<CardComposite
										artImageUrl={resolveAssetUrl(cardItem.imageUrl) ?? ''}
										frameImageUrl={defaultFrameOverlayImageUrl}
										titleImageUrl={titleOverlayImageUrl}
										titleText={cardItem.name ?? cardItem.code}
										aspectWidth={1444}
										aspectHeight={1920}
										artObjectFit="cover"
										enableTilt={true}
										descriptionText={cardItem.description ?? ''}
										magicValue={cardItem.magic ?? 0}
										mightValue={cardItem.might ?? 0}
										fireValue={cardItem.fire ?? 0}
										cornerNumberValue={cardItem.number ?? 0}
									/>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	{/if}
</div>

{#if selectedCardItem}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		on:click|self={closeCardModal}
		on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && closeCardModal()}
	>
		<div
			class="modal-card"
			role="dialog"
			aria-modal="true"
			aria-label={selectedCardItem.name ?? selectedCardItem.code}
		>
			<button class="modal-close" on:click={closeCardModal} aria-label={$t('gallery.close')}
				>×</button
			>
			<div class="modal-inner">
				<div class="modal-card-wrap">
					<CardComposite
						artImageUrl={resolveAssetUrl(selectedCardItem.imageUrl) ?? ''}
						frameImageUrl={defaultFrameOverlayImageUrl}
						titleImageUrl={titleOverlayImageUrl}
						titleText={selectedCardItem.name ?? selectedCardItem.code}
						aspectWidth={1444}
						aspectHeight={1920}
						artObjectFit="cover"
						enableTilt={true}
						descriptionText={selectedCardItem.description ?? ''}
						magicValue={selectedCardItem.magic ?? 0}
						mightValue={selectedCardItem.might ?? 0}
						fireValue={selectedCardItem.fire ?? 0}
						cornerNumberValue={selectedCardItem.number ?? 0}
					/>
				</div>

				<div class="meta">
					<p class="meta-eyebrow">
						<span class="meta-collection"
							>{selectedCardItem.collectionName ?? $t('gallery.card')}</span
						>
						<span class="meta-number">№ {selectedCardItem.number ?? 0}</span>
					</p>
					<h2 class="meta-title">{selectedCardItem.name ?? selectedCardItem.code}</h2>
					<p class="meta-code mono">{selectedCardItem.code}</p>

					<div class="attrs">
						{#each modalStats as stat}
							<span class="attr">
								<img class="attr-icon" src={stat.icon} alt="" aria-hidden="true" />
								<span class="attr-value">{stat.value}</span>
								<span class="attr-label">{stat.label}</span>
							</span>
						{/each}
					</div>

					{#if selectedCardItem.description}
						<p class="meta-desc">{selectedCardItem.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}
