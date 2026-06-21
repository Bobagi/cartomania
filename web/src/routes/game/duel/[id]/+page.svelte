<script lang="ts">
	import { browser } from '$app/environment';
	import { page as sveltePageStore } from '$app/stores';
	import {
		advanceCartomaniaDuel,
		chooseCartomaniaDuelAttribute,
		chooseCartomaniaDuelCard,
		fetchCartomaniaCardCatalog,
		fetchCartomaniaGameResult,
		fetchCartomaniaGameStateById,
		fetchMultipleCartomaniaCardMetadata,
		startAttributeDuelCartomaniaGameForPlayer,
		surrenderCartomaniaGame,
		unchooseCartomaniaDuelCard
	} from '$lib/api/GameClient';
	import CardComposite from '$lib/components/CardComposite.svelte';
	import UiIcon from '$lib/components/UiIcon.svelte';
	import DuelHistory from '$lib/components/DuelHistory.svelte';
	import CardFxFilters from '$lib/cards/CardFxFilters.svelte';
	import {
		CardDestroyer,
		DESTRUCTION_DEFAULTS,
		type DestructionType
	} from '$lib/cards/cardDestruction';
	import '$lib/cards/cardFx.css';
	import { detectChosenAttributeMode, normalizeDuelCenterForView } from '$lib/duel/duelCenter';
	import { buildHistoryFromLog, buildLiveRound } from '$lib/duel/history';
	import { t } from '$lib/i18n';
	import type { DuelHistoryCardInfo, DuelHistoryItem } from '$lib/duel/historyTypes';
	import { authUser } from '$lib/stores/authStore';
	import { game as gameStateStore, type GameState } from '$lib/stores/game';
	import '$lib/styles/routes/gameDuelPage.css';
	import '$lib/styles/routes/duelBoardLayout.css';
	import { onDestroy, onMount } from 'svelte';
	import '../../game.css';

	export const REVEAL_PAUSE_MS = 3000;
	export const DRAW_TRAVEL_MS = 420;
	export const FLIP_MS = 500;
	export const LOSER_SHAKE_BEFORE_DEFEAT_EFFECT_MS = 2000;
	export const DEFEAT_EFFECT_DURATION_MS = 2200;
	export const REVEAL_EXTRA_BUFFER_MS = 400;

	// The server (DuelProgressionService) is the single authority for turn timeouts and
	// round advancement. The client never drives the game — it only renders the latest
	// server state (polled) and sends real moves. Flip this on only to debug locally.
	const CLIENT_DRIVES_TIMEOUTS = false;
	const STATE_POLL_INTERVAL_MS = 1000;

	type CardDetails = {
		code: string;
		name: string;
		description: string;
		imageUrl: string;
		might: number;
		fire: number;
		magic: number;
		number: number;
	};

	let frameOverlayImageUrl: string | null = '/frames/default.png';
	const titleOverlayImageUrl = '/frames/title.png';
	const cardBackImageUrl = '/frames/card-back.png';

	let errorMessageText: string | null = null;
	let finalGameResult: { winner: string | null; log: string[] } | null = null;

	$: currentGameId = $sveltePageStore.params.id;
	$: currentDuelCenter = $gameStateStore?.duelCenter ?? null;
	$: currentDuelStage = $gameStateStore?.duelStage ?? null;
	$: currentDuelRoundWinner = currentDuelCenter?.roundWinner ?? null;
	// Sized against viewport height so the whole board fits one screen without
	// scrolling (both hands + the battlefield visible at once).
	const cardWidthCssValue = 'clamp(104px, 18vh, 214px)';
	const trophyIconSvg =
		'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18 4V2H6v2H2v4a4 4 0 0 0 4 4h.5A6 6 0 0 0 11 15.9V18H7v2h10v-2h-4v-2.1A6 6 0 0 0 17.5 12H18a4 4 0 0 0 4-4V4h-4ZM6 10a2 2 0 0 1-2-2V6h2v4Zm14-2a2 2 0 0 1-2 2V6h2v2Z"/></svg>';
	const cardsIconSvg =
		'<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="8" y="3" width="11" height="15" rx="2" opacity=".5"/><rect x="4" y="6" width="11" height="15" rx="2"/></svg>';

	let now = Date.now();
	let duelTimerHandle: ReturnType<typeof setInterval> | null = null;
	let duelStatePollHandle: ReturnType<typeof setInterval> | null = null;
	let duelTimeoutSignature: string | null = null;
	let duelTimeoutHandledForSignature = false;
	let duelTimeoutResolver: Promise<void> | null = null;

	function formatRemainingTime(milliseconds: number): string {
		const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	type HandCardItem = {
		code: string;
		uid: string;
		name?: string;
		description?: string;
		imageUrl?: string;
		might?: number;
		fire?: number;
		magic?: number;
		number: number;
	};

	let playerHandCardItems: HandCardItem[] = [];
	let pendingCardRevealUidSet = new Set<string>();
	let pendingHiddenUidSet = new Set<string>();
	let autoFlipCycleCounter = 0;

	let centerRevealCycle = 0;
	let previousDuelStage: string | null = null;

	// Layout toggle: move the hand to the right rail and enlarge the battlefield.
	let sideHand = false;
	function toggleSideHand() {
		sideHand = !sideHand;
		if (browser) {
			try {
				localStorage.setItem('duel-side-hand', sideHand ? '1' : '0');
			} catch {
				/* ignore */
			}
		}
	}
	let advanceTimer: number | null = null;

	let fxLayerElement: HTMLDivElement | null = null;
	let playerDeckAnchorElement: HTMLDivElement | null = null;
	let opponentDeckAnchorElement: HTMLDivElement | null = null;
	let opponentHandContainerElement: HTMLDivElement | null = null;
	let centerSlotAElement: HTMLDivElement | null = null;
	let centerSlotBElement: HTMLDivElement | null = null;
	let lastDefeatEffectCycleId: number | null = null;

	let hasInitialStateLoaded = false;
	let previousOppHandCount: number | null = null;

	let playerA: string = 'playerA';
	let playerB: string = 'playerB';
	let playerAUsername: string = 'playerA';
	let playerBUsername: string = 'playerB';

	let lastReturnedCode: string | null = null;

	let duelHistoryItems: DuelHistoryItem[] = [];

	type LogCategory = 'player' | 'opponent' | 'neutral';

	function getLogPresentation(line: string): {
		category: LogCategory;
		icon: string;
		text: string;
	} {
		const safeLine = line ?? '';
		const normalizedLine = safeLine.toLowerCase();
		const normalizedPlayer = (playerAUsername ?? '').toLowerCase();
		const normalizedOpponent = (playerBUsername ?? '').toLowerCase();

		const victoryMatch = safeLine.match(/victory:\s*([^]+?) defeats/i);
		if (victoryMatch && victoryMatch[1]) {
			const winnerText = victoryMatch[1].toLowerCase();
			if (normalizedPlayer && winnerText.includes(normalizedPlayer)) {
				return { category: 'player', icon: '🛡️', text: safeLine };
			}
			if (normalizedOpponent && winnerText.includes(normalizedOpponent)) {
				return { category: 'opponent', icon: '⚔️', text: safeLine };
			}
		}

		if (normalizedPlayer && normalizedLine.includes(normalizedPlayer)) {
			return { category: 'player', icon: '🛡️', text: safeLine };
		}
		if (normalizedOpponent && normalizedLine.includes(normalizedOpponent)) {
			return { category: 'opponent', icon: '⚔️', text: safeLine };
		}
		return { category: 'neutral', icon: '✨', text: safeLine };
	}

	function resolveDuelHistoryCard(code: string | null | undefined): DuelHistoryCardInfo | null {
		if (!code) return null;
		const details = cardDetailsCacheByCode.get(code);
		if (!details) return null;
		return { name: details.name, imageUrl: details.imageUrl };
	}

	function isHighlightedAttribute(attr: 'magic' | 'might' | 'fire'): boolean {
		if (!chooserCardDetails) return false;
		const stats = {
			magic: chooserCardDetails.magic ?? 0,
			might: chooserCardDetails.might ?? 0,
			fire: chooserCardDetails.fire ?? 0
		};
		const highest = Math.max(stats.magic, stats.might, stats.fire);
		return stats[attr] === highest && highest > 0;
	}

	function resolveStrongestAttributeFromDetails(
		details: Pick<CardDetails, 'magic' | 'might' | 'fire'> | null | undefined
	): 'magic' | 'might' | 'fire' | null {
		if (!details) return null;
		const stats: Record<'magic' | 'might' | 'fire', number> = {
			magic: Number(details.magic ?? 0),
			might: Number(details.might ?? 0),
			fire: Number(details.fire ?? 0)
		};
		let best: 'magic' | 'might' | 'fire' = 'magic';
		let bestValue = -Infinity;
		for (const attribute of ['magic', 'might', 'fire'] as const) {
			const value = stats[attribute];
			if (value > bestValue) {
				best = attribute;
				bestValue = value;
			}
		}
		return bestValue > -Infinity ? best : null;
	}

	function resolveStrongestAttributeForCard(
		cardCode: string | null | undefined
	): 'magic' | 'might' | 'fire' | null {
		if (!cardCode) return null;
		const details = cardDetailsCacheByCode.get(cardCode) ?? null;
		return resolveStrongestAttributeFromDetails(details);
	}

	function resolvePreferredAttributeForChooser(
		chooser: string | null | undefined
	): 'magic' | 'might' | 'fire' {
		const cardCode = chooser
			? chooser === playerA
				? (currentDuelCenter?.aCardCode ?? null)
				: (currentDuelCenter?.bCardCode ?? null)
			: null;
		const preferred =
			resolveStrongestAttributeForCard(cardCode) ??
			resolveStrongestAttributeFromDetails(chooser === playerA ? chooserCardDetails : null);
		return preferred ?? 'magic';
	}

	function isBotIdentity(
		playerId: string | null | undefined,
		username: string | null | undefined
	): boolean {
		const normalizedId = (playerId ?? '').trim().toUpperCase();
		if (normalizedId === 'BOT') return true;
		const normalizedName = (username ?? '').toLowerCase();
		return /\bbot\b/.test(normalizedName);
	}

	const makeUid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

	function reconcile(prev: HandCardItem[], nextCodes: string[]) {
		const buckets = new Map<string, HandCardItem[]>();
		for (const it of prev) {
			const arr = buckets.get(it.code) ?? [];
			arr.push(it);
			buckets.set(it.code, arr);
		}
		const created: string[] = [];
		const items: HandCardItem[] = [];
		for (const code of nextCodes) {
			const q = buckets.get(code);
			if (q && q.length) {
				items.push(q.shift() as HandCardItem);
			} else {
				const uid = makeUid();
				items.push({ code, uid, number: 1 });
				created.push(uid);
			}
		}
		return { items, created };
	}

	let cardDetailsCacheByCode = new Map<string, CardDetails>();
	let catalogNumberByCode = new Map<string, number>();
	let codeByLowerName = new Map<string, string>();
	let catalogLoaded = false;
	let chooserCardDetails: CardDetails | null = null;

	async function ensureCatalogLoaded() {
		if (catalogLoaded) return;
		try {
			const catalogCollections = await fetchCartomaniaCardCatalog();
			for (const collection of catalogCollections) {
				for (const catalogEntry of collection.cards) {
					const entry = catalogEntry as unknown as {
						code: string;
						name?: string;
						description?: string;
						imageUrl?: string;
						image?: string;
						might?: number;
						fire?: number;
						magic?: number;
						number?: number;
					};
					catalogNumberByCode.set(entry.code, Number(entry.number ?? 0));
					if (entry.name) codeByLowerName.set(entry.name.toLowerCase(), entry.code);
					if (!cardDetailsCacheByCode.has(entry.code)) {
						cardDetailsCacheByCode.set(entry.code, {
							code: entry.code,
							name: entry.name ?? entry.code,
							description: entry.description ?? '',
							imageUrl: entry.imageUrl ?? entry.image ?? '',
							might: Number(entry.might ?? 0),
							fire: Number(entry.fire ?? 0),
							magic: Number(entry.magic ?? 0),
							number: Number(entry.number ?? 0)
						});
					}
				}
			}
			cardDetailsCacheByCode = new Map(cardDetailsCacheByCode);
			codeByLowerName = new Map(codeByLowerName);
		} finally {
			catalogLoaded = true;
		}
	}

	async function ensureCodesCached(codes: string[]) {
		const missingCodes = codes.filter((code) => {
			const cachedCard = cardDetailsCacheByCode.get(code);
			return !cachedCard || Number.isNaN(cachedCard.number);
		});
		if (!missingCodes.length) return;

		await ensureCatalogLoaded();

		const cartomaniaCards = await fetchMultipleCartomaniaCardMetadata(missingCodes);
		for (const cartomaniaCard of cartomaniaCards) {
			const resolvedNumber =
				cartomaniaCard.number || catalogNumberByCode.get(cartomaniaCard.code) || 0;
			cardDetailsCacheByCode.set(cartomaniaCard.code, {
				code: cartomaniaCard.code,
				name: cartomaniaCard.name,
				description: cartomaniaCard.description,
				imageUrl: cartomaniaCard.image,
				might: cartomaniaCard.might,
				fire: cartomaniaCard.fire,
				magic: cartomaniaCard.magic,
				number: resolvedNumber
			});
		}
		cardDetailsCacheByCode = new Map(cardDetailsCacheByCode);
	}

	function startDrawFx(fromEl: Element | null, toEl: Element | null, copies: number): number {
		if (!fromEl || !toEl || !fxLayerElement || copies <= 0) return 0;
		const fromRect = fromEl.getBoundingClientRect();
		const toRect = toEl.getBoundingClientRect();
		const fromCx = fromRect.left + fromRect.width / 2;
		const fromCy = fromRect.top + fromRect.height / 2;
		const toCx = toRect.left + toRect.width / 2;
		const toCy = toRect.top + toRect.height / 2;
		const dx = toCx - fromCx;
		const dy = toCy - fromCy;
		for (let i = 0; i < copies; i++) {
			const fxCardElement = document.createElement('div');
			fxCardElement.className = 'fx-card';
			fxCardElement.style.left = `${fromCx - fromRect.width / 2}px`;
			fxCardElement.style.top = `${fromCy - fromRect.height / 2}px`;
			fxCardElement.style.width = `${Math.min(fromRect.width, toRect.width)}px`;
			const fxImgElement = document.createElement('img');
			fxImgElement.src = cardBackImageUrl;
			fxImgElement.alt = '';
			fxCardElement.appendChild(fxImgElement);
			fxLayerElement.appendChild(fxCardElement);
			const rotateDeg = (Math.random() * 10 - 5).toFixed(2);
			const animation = fxCardElement.animate(
				[
					{ transform: 'translate(0px,0px) rotate(0deg)', opacity: 0.9 },
					{ transform: `translate(${dx}px,${dy}px) rotate(${rotateDeg}deg)`, opacity: 0.0 }
				],
				{ duration: DRAW_TRAVEL_MS, easing: 'cubic-bezier(.22,.61,.36,1)', fill: 'forwards' }
			);
			animation.onfinish = () => fxCardElement.remove();
		}
		return DRAW_TRAVEL_MS;
	}

	function addPendingFlipsFor(uids: string[]) {
		const next = new Set(pendingCardRevealUidSet);
		for (const u of uids) next.add(u);
		pendingCardRevealUidSet = next;
		autoFlipCycleCounter++;
	}

	function clearPendingFlipFor(uid: string) {
		const next = new Set(pendingCardRevealUidSet);
		next.delete(uid);
		pendingCardRevealUidSet = next;
	}

	function hideUids(uids: string[]) {
		const next = new Set(pendingHiddenUidSet);
		for (const u of uids) next.add(u);
		pendingHiddenUidSet = next;
	}

	function unhideUids(uids: string[]) {
		const next = new Set(pendingHiddenUidSet);
		for (const u of uids) next.delete(u);
		pendingHiddenUidSet = next;
	}

	async function loadGameStateOrFinalResult() {
		errorMessageText = null;
		try {
			const state = (await fetchCartomaniaGameStateById(currentGameId)) as GameState | null;
			if (state && typeof state === 'object') {
				finalGameResult = null;
				state.duelCenter = normalizeDuelCenterForView(state.duelCenter);
				gameStateStore.set({ ...state, gameId: currentGameId });

				const me = state.players[0];
				const opp = state.players[1] ?? 'playerB';

				const myCodes = Array.isArray(state.hands?.[me]) ? (state.hands[me] as string[]) : [];
				const { items, created } = reconcile(playerHandCardItems, myCodes);
				playerHandCardItems = items;

				let createdFromUnchoose: string[] = [];
				if (lastReturnedCode) {
					createdFromUnchoose = playerHandCardItems
						.filter((it) => it.code === lastReturnedCode && created.includes(it.uid))
						.map((it) => it.uid);
				}
				const createdFromDeck = created.filter((uid) => !createdFromUnchoose.includes(uid));

				if (myCodes.length) await ensureCodesCached(myCodes);
				const centers: string[] = [];
				if (state.duelCenter?.aCardCode) centers.push(state.duelCenter.aCardCode);
				if (state.duelCenter?.bCardCode) centers.push(state.duelCenter.bCardCode);
				if (centers.length) await ensureCodesCached(centers);

				playerHandCardItems = playerHandCardItems.map((it) => {
					const d = cardDetailsCacheByCode.get(it.code);
					return d
						? {
								...it,
								name: d.name,
								description: d.description,
								imageUrl: d.imageUrl,
								might: d.might,
								fire: d.fire,
								magic: d.magic,
								number: d.number
							}
						: it;
				});

				const newOppCount = Array.isArray(state.hands?.[opp]) ? state.hands[opp].length : 0;

				if (state.mode === 'ATTRIBUTE_DUEL' && state.duelStage === 'REVEAL') {
					// Animate the flip/defeat only once per reveal — polling re-runs this block.
					if (previousDuelStage !== 'REVEAL') {
						centerRevealCycle++;
					}
					if (advanceTimer) window.clearTimeout(advanceTimer);
					if (CLIENT_DRIVES_TIMEOUTS) {
						advanceTimer = window.setTimeout(
							async () => {
								try {
									await advanceCartomaniaDuel(currentGameId);
								} finally {
									await loadGameStateOrFinalResult();
								}
							},
							Math.max(
								REVEAL_PAUSE_MS,
								LOSER_SHAKE_BEFORE_DEFEAT_EFFECT_MS +
									DEFEAT_EFFECT_DURATION_MS +
									REVEAL_EXTRA_BUFFER_MS
							)
						);
					}
				} else if (advanceTimer) {
					window.clearTimeout(advanceTimer);
					advanceTimer = null;
				}
				previousDuelStage = state.duelStage;

				if (hasInitialStateLoaded) {
					if (createdFromDeck.length) {
						hideUids(createdFromDeck);
						const totalMs = startDrawFx(
							playerDeckAnchorElement,
							myHandContainerElement,
							createdFromDeck.length
						);
						window.setTimeout(() => {
							unhideUids(createdFromDeck);
							addPendingFlipsFor(createdFromDeck);
						}, totalMs);
					}
					if (createdFromUnchoose.length) {
						unhideUids(createdFromUnchoose);
					}
					if (previousOppHandCount !== null && newOppCount > previousOppHandCount) {
						startDrawFx(
							opponentDeckAnchorElement,
							opponentHandContainerElement,
							newOppCount - previousOppHandCount
						);
					}
				}

				previousOppHandCount = newOppCount;
				hasInitialStateLoaded = true;
				lastReturnedCode = null;
				return;
			}
		} catch {}
		try {
			finalGameResult = await fetchCartomaniaGameResult(currentGameId);
		} catch {
			errorMessageText = $t('duel.errorLoadState');
		}
	}

	function isGameOver(): boolean {
		return Boolean(($gameStateStore?.winner ?? finalGameResult?.winner ?? null) !== null);
	}

	async function onHandCardClick(e: MouseEvent, cardCode: string) {
		const state = $gameStateStore;
		if (!state || isGameOver()) return;
		if (state.mode !== 'ATTRIBUTE_DUEL') return;
		if (state.duelCenter?.aCardCode) return;
		if (state.duelStage !== 'PICK_CARD') return;
		const me = state.players[0];
		await chooseCartomaniaDuelCard(currentGameId, me, cardCode);
		await loadGameStateOrFinalResult();
	}

	async function onCenterCardReturnToHand() {
		const state = $gameStateStore;
		if (!state) return;
		if (state.mode !== 'ATTRIBUTE_DUEL') return;
		if (state.duelStage === 'REVEAL') return;
		if (!state.duelCenter?.aCardCode) return;
		const me = state.players[0];
		lastReturnedCode = state.duelCenter.aCardCode || null;
		await unchooseCartomaniaDuelCard(currentGameId, me);
		await loadGameStateOrFinalResult();
	}

	async function playAnotherDuel() {
		const me = $authUser?.id ?? $gameStateStore?.players?.[0] ?? null;
		if (!me || !browser) {
			if (browser) window.location.assign('/');
			return;
		}
		try {
			const { gameId } = await startAttributeDuelCartomaniaGameForPlayer(me);
			window.location.assign(`/game/duel/${gameId}`);
		} catch (error) {
			console.error('Failed to start a new duel', error);
			window.location.assign('/');
		}
	}

	async function surrenderDuelGame() {
		if (isGameOver()) return;
		if (!$authUser) {
			errorMessageText = $t('duel.loginToSurrender');
			return;
		}
		if (browser && !window.confirm($t('duel.surrenderConfirm'))) {
			return;
		}
		try {
			await surrenderCartomaniaGame(currentGameId);
			await loadGameStateOrFinalResult();
		} catch (error) {
			console.error('Failed to surrender duel game', error);
			errorMessageText = $t('duel.errorSurrender');
		}
	}

	async function chooseAttr(attr: 'magic' | 'might' | 'fire') {
		if (isGameOver()) return;
		const me = $gameStateStore?.players?.[0] ?? 'playerA';
		await chooseCartomaniaDuelAttribute(currentGameId, me, attr);
		await loadGameStateOrFinalResult();
	}

	// Round-loss destruction: the losing card burns (fire) / dissolves (magic) /
	// crushes (might), strictly on the card. Tunable in /cards-lab.
	const DUEL_DESTRUCTION_DELAY_MS = 450;
	let activeDestruction: {
		destroyer: CardDestroyer;
		canvas: HTMLCanvasElement;
		card: HTMLElement;
		wrap: HTMLElement;
	} | null = null;
	function clearActiveDestruction() {
		if (!activeDestruction) return;
		const { destroyer, canvas, card, wrap } = activeDestruction;
		activeDestruction = null;
		destroyer.reset(true);
		canvas.remove();
		card.classList.remove('cardfx-card');
		wrap.classList.remove('cardfx-wrap');
	}
	function playDuelDestruction(loserEl: HTMLElement, mode: 'fire' | 'magic' | 'might') {
		const wrap = loserEl.parentElement as HTMLElement | null;
		if (!wrap) return;
		// Clean up the previous round's effect; the current one stays until this round advances.
		clearActiveDestruction();
		loserEl.style.animation = 'none';
		loserEl.classList.add('cardfx-card');
		wrap.classList.add('cardfx-wrap');
		const canvas = document.createElement('canvas');
		canvas.className = 'fx-canvas';
		wrap.appendChild(canvas);
		const type: DestructionType =
			mode === 'magic' ? 'dissolve' : mode === 'might' ? 'crush' : 'burn';
		const destroyer = new CardDestroyer({ card: loserEl, wrap, canvas });
		destroyer.play(type, { ...DESTRUCTION_DEFAULTS, destructDuration: 1.4 });
		// Do NOT reset — the card stays consumed/crushed until the round advances and
		// the slot clears it. (Resetting made it "reappear whole" before advancing.)
		activeDestruction = { destroyer, canvas, card: loserEl, wrap };
	}

	function findLoserCenterElement(): HTMLElement | null {
		const winner = currentDuelRoundWinner;
		if (!winner) return null;
		if (winner === playerA) return centerSlotBElement;
		if (winner === playerB) return centerSlotAElement;
		return null;
	}

	onMount(async () => {
		if (browser) {
			sideHand = localStorage.getItem('duel-side-hand') === '1';
			duelTimerHandle = window.setInterval(() => {
				now = Date.now();
			}, 250);
			// Server-authoritative: poll the latest state so the client reflects the
			// server's own timeouts/advances (and a live PvP opponent's moves).
			duelStatePollHandle = window.setInterval(() => {
				if (currentGameId && resolvedWinner === null && !duelTimeoutResolver) {
					void loadGameStateOrFinalResult();
				}
			}, STATE_POLL_INTERVAL_MS);
		}
		await ensureCatalogLoaded();
		await loadGameStateOrFinalResult();
		setupMyHandResizeObserver();
	});

	onDestroy(() => {
		if (advanceTimer) window.clearTimeout(advanceTimer);
		if (duelTimerHandle) {
			window.clearInterval(duelTimerHandle);
			duelTimerHandle = null;
		}
		if (duelStatePollHandle) {
			window.clearInterval(duelStatePollHandle);
			duelStatePollHandle = null;
		}
		clearActiveDestruction();
	});

	$: playerA = $gameStateStore?.players?.[0] ?? 'playerA';
	$: playerB = $gameStateStore?.players?.[1] ?? 'playerB';
	$: playerAUsername = $gameStateStore?.playerUsernames?.[playerA] ?? playerA;
	$: playerBUsername = $gameStateStore?.playerUsernames?.[playerB] ?? playerB;
	$: opponentLooksLikeBot = isBotIdentity(playerB, playerBUsername);
	$: duelStage = currentDuelStage ?? null;
	$: duelCenter = currentDuelCenter ?? null;
	$: chooserId = duelCenter?.chooserId ?? playerA;
	$: discardPiles = $gameStateStore?.discardPiles ?? null;
	$: hpA = $gameStateStore?.hp?.[playerA] ?? 0;
	$: hpB = $gameStateStore?.hp?.[playerB] ?? 0;
	$: deckA = Array.isArray($gameStateStore?.decks?.[playerA])
		? $gameStateStore!.decks[playerA].length
		: 0;
	$: deckB = Array.isArray($gameStateStore?.decks?.[playerB])
		? $gameStateStore!.decks[playerB].length
		: 0;
	$: oppHandCount = Array.isArray($gameStateStore?.hands?.[playerB])
		? $gameStateStore!.hands[playerB].length
		: 0;

	// --- Circular battlefield ("arena", step 2) ---------------------------------
	// The played card's creature ART is masked into the felt circle (background) AND
	// the whole card is shown on top for clarity (name + attributes). Your half
	// (bottom) fills the moment you pick; the opponent's half (top) reveals on REVEAL.
	$: youCardCode = currentDuelCenter?.aCardCode ?? null;
	$: oppCardCode = currentDuelCenter?.bCardCode ?? null;
	$: youCard = youCardCode ? (cardDetailsCacheByCode.get(youCardCode) ?? null) : null;
	$: oppCard = oppCardCode ? (cardDetailsCacheByCode.get(oppCardCode) ?? null) : null;
	$: youArt = youCard?.imageUrl ?? null;
	$: oppArt = oppCard?.imageUrl ?? null;
	$: youName = youCard?.name ?? youCardCode;
	$: oppName = oppCard?.name ?? oppCardCode;
	$: oppRevealed = currentDuelStage === 'REVEAL';
	$: youOutcome =
		currentDuelStage === 'REVEAL' && currentDuelRoundWinner
			? currentDuelRoundWinner === playerA
				? 'win'
				: 'lose'
			: null;
	$: oppOutcome =
		currentDuelStage === 'REVEAL' && currentDuelRoundWinner
			? currentDuelRoundWinner === playerB
				? 'win'
				: 'lose'
			: null;

	let myHandContainerElement: HTMLDivElement | null = null;
	let myHandCardSpreadPixels: number | null = null;
	function computeSpread() {
		const count = Math.max(1, playerHandCardItems.length);
		const w = myHandContainerElement?.clientWidth ?? 0;
		myHandCardSpreadPixels = Math.min(132, Math.max(46, (w / count) * 0.62));
	}
	function setupMyHandResizeObserver() {
		const ro = new ResizeObserver(() => computeSpread());
		if (myHandContainerElement) ro.observe(myHandContainerElement);
	}
	$: computeSpread();

	$: canReturnSelectedCardToHand =
		!($gameStateStore?.winner ?? finalGameResult?.winner ?? null) &&
		$gameStateStore?.mode === 'ATTRIBUTE_DUEL' &&
		Boolean(currentDuelCenter?.aCardCode) &&
		currentDuelStage !== 'REVEAL' &&
		($gameStateStore?.players?.[0] ?? '') === chooserId;
	$: duelDeadlineAt =
		typeof currentDuelCenter?.deadlineAt === 'number' ? currentDuelCenter.deadlineAt : null;
	$: duelTimerWinner = $gameStateStore?.winner ?? finalGameResult?.winner ?? null;
	$: duelRemainingMs =
		duelTimerWinner === null && duelDeadlineAt ? Math.max(0, duelDeadlineAt - now) : null;
	$: duelCountdownText = duelRemainingMs !== null ? formatRemainingTime(duelRemainingMs) : null;
	$: duelTimerLabel = (() => {
		if (!duelCountdownText) return null;
		if (currentDuelStage === 'PICK_ATTRIBUTE') {
			return chooserId === playerA
				? $t('duel.timerChooseAttribute')
				: $t('duel.timerOpponentChoosing');
		}
		if (currentDuelStage === 'PICK_CARD') {
			return $t('duel.timerSelectCards');
		}
		return null;
	})();
	$: showDuelCountdown = Boolean(duelCountdownText && duelTimerLabel);
	$: duelCountdownCritical = Boolean(duelRemainingMs !== null && duelRemainingMs <= 3000);
	async function autoResolveExpiredDuelTurn(stageHint: GameState['duelStage'] | null) {
		if (!currentGameId || duelTimeoutResolver) return;

		const enqueue = (work: () => Promise<void>) => {
			duelTimeoutResolver = work().finally(() => {
				duelTimeoutResolver = null;
			});
		};

		enqueue(async () => {
			const ensureLatestState = async () => {
				if ($gameStateStore) return $gameStateStore;
				await loadGameStateOrFinalResult();
				return $gameStateStore;
			};

			let state = await ensureLatestState();
			if (!state) return;

			const pickFallbackCardFromHand = (hand: string[] | undefined | null) => {
				if (!hand || hand.length === 0) return null;
				return hand[0] ?? null;
			};

			const resolveAutoCards = async () => {
				const center = state?.duelCenter ?? null;
				if (!center) return false;

				const hands = state.hands ?? {};

				const pendingSelections: Array<Promise<void>> = [];

				if (!center.aCardCode) {
					const autoCard = pickFallbackCardFromHand(hands[playerA] as string[] | undefined);
					if (autoCard) {
						pendingSelections.push(
							chooseCartomaniaDuelCard(currentGameId, playerA, autoCard).catch((error) => {
								console.error('Failed to auto-pick card for playerA after timeout', error);
							})
						);
					}
				}

				const botControlsOpponent = !center.bCardCode && isBotIdentity(playerB, playerBUsername);
				if (botControlsOpponent) {
					const autoCard = pickFallbackCardFromHand(hands[playerB] as string[] | undefined);
					if (autoCard) {
						pendingSelections.push(
							chooseCartomaniaDuelCard(currentGameId, playerB, autoCard).catch((error) => {
								console.error('Failed to auto-pick card for playerB after timeout', error);
							})
						);
					}
				}

				if (!pendingSelections.length) return false;
				await Promise.all(pendingSelections);
				await loadGameStateOrFinalResult();
				state = $gameStateStore ?? state;
				return true;
			};

			const cardsResolved =
				stageHint === 'PICK_CARD' || state?.duelStage === 'PICK_CARD'
					? await resolveAutoCards()
					: false;

			state = $gameStateStore ?? state;
			if (!state) return;

			const centerAfter = state.duelCenter ?? null;
			const readyForAttribute = Boolean(
				centerAfter?.aCardCode && centerAfter?.bCardCode && !centerAfter?.chosenAttribute
			);
			const chooser = centerAfter?.chooserId ?? playerA;
			const chooserIsLocal = chooser === playerA;
			const chooserIsBot = isBotIdentity(
				chooser,
				chooser === playerA ? playerAUsername : playerBUsername
			);

			if (
				readyForAttribute &&
				(state.duelStage === 'PICK_ATTRIBUTE' || cardsResolved) &&
				(chooserIsLocal || chooserIsBot)
			) {
				const attribute = resolvePreferredAttributeForChooser(chooser);
				try {
					await chooseCartomaniaDuelAttribute(currentGameId, chooser, attribute);
				} catch (error) {
					console.error('Failed to auto-select duel attribute after timeout', error);
					return;
				}
				await loadGameStateOrFinalResult();
			}
		});
	}

	$: {
		const deadline = duelDeadlineAt ?? null;
		const stageKey = currentDuelStage ?? 'NONE';
		const nextSignature = `${stageKey}:${deadline ?? 'none'}`;
		if (nextSignature !== duelTimeoutSignature) {
			duelTimeoutSignature = nextSignature;
			duelTimeoutHandledForSignature = false;
		}

		const deadlineReached =
			duelRemainingMs !== null ? duelRemainingMs <= 0 : deadline !== null && Date.now() >= deadline;

		if (
			CLIENT_DRIVES_TIMEOUTS &&
			browser &&
			!duelTimeoutHandledForSignature &&
			deadlineReached &&
			!(duelTimerWinner ?? null) &&
			currentGameId
		) {
			duelTimeoutHandledForSignature = true;
			autoResolveExpiredDuelTurn(currentDuelStage ?? null);
		}
	}

	$: chooserCardDetails =
		duelStage === 'PICK_ATTRIBUTE' && chooserId === playerA && currentDuelCenter?.aCardCode
			? (cardDetailsCacheByCode.get(currentDuelCenter.aCardCode) ?? null)
			: null;

	$: {
		// Recompute the structured timeline whenever the log, card data, or the
		// current reveal changes. The card maps are referenced explicitly so Svelte
		// re-runs this block once the catalog details finish loading.
		void cardDetailsCacheByCode;
		void codeByLowerName;
		void centerRevealCycle;
		void currentDuelCenter;
		const logs = $gameStateStore?.log ?? [];
		const parsed = buildHistoryFromLog(logs, {
			resolveCodeByName: (name) => {
				const trimmed = (name ?? '').trim();
				return trimmed ? (codeByLowerName.get(trimmed.toLowerCase()) ?? null) : null;
			},
			getLogPresentation,
			surrenderedText: $t('duel.playerSurrendered')
		});
		const roundCount = parsed.reduce(
			(accumulator, item) => (item.kind === 'round' ? accumulator + 1 : accumulator),
			0
		);
		const live =
			duelStage === 'REVEAL'
				? buildLiveRound({
						roundNumber: roundCount + 1,
						center: currentDuelCenter,
						resolveDetails: (code) => cardDetailsCacheByCode.get(code) ?? null,
						playerA,
						playerB,
						revealCycle: centerRevealCycle
					})
				: null;
		duelHistoryItems = live ? [...parsed, live] : parsed;
	}

	$: {
		if (
			duelStage === 'REVEAL' &&
			currentDuelRoundWinner &&
			centerRevealCycle !== null &&
			centerRevealCycle !== lastDefeatEffectCycleId
		) {
			const loserEl = findLoserCenterElement();
			const mode = detectChosenAttributeMode(currentDuelCenter);
			lastDefeatEffectCycleId = centerRevealCycle;
			if (loserEl) {
				window.setTimeout(() => {
					playDuelDestruction(loserEl as HTMLElement, mode);
				}, DUEL_DESTRUCTION_DELAY_MS);
			}
		}
	}

	$: resolvedWinner = $gameStateStore?.winner ?? finalGameResult?.winner ?? null;

	// In ATTRIBUTE_DUEL the match is decided by captured cards: the round winner
	// takes both cards into their discard pile, so rounds-won = pile size / 2.
	$: roundsWonA = Math.floor((discardPiles?.[playerA] ?? []).length / 2);
	$: roundsWonB = Math.floor((discardPiles?.[playerB] ?? []).length / 2);
	$: chooserUsername =
		chooserId === playerA ? playerAUsername : chooserId === playerB ? playerBUsername : chooserId;

	const ROUND_BANNER_ICON: Record<'win' | 'lose' | 'draw', string> = {
		win: '🏆',
		lose: '💥',
		draw: '🤝'
	};
	$: roundBanner = (() => {
		if (currentDuelStage !== 'REVEAL') return null;
		if (!currentDuelRoundWinner) {
			return { tone: 'draw' as const, icon: ROUND_BANNER_ICON.draw, text: $t('duel.roundTied') };
		}
		if (currentDuelRoundWinner === playerA) {
			return { tone: 'win' as const, icon: ROUND_BANNER_ICON.win, text: $t('duel.roundYouWin') };
		}
		return {
			tone: 'lose' as const,
			icon: ROUND_BANNER_ICON.lose,
			text: $t('duel.roundOpponentWins', { name: playerBUsername })
		};
	})();

	$: endOutcome =
		resolvedWinner === null
			? null
			: resolvedWinner === 'DRAW'
				? 'draw'
				: resolvedWinner === playerA
					? 'win'
					: 'lose';
	$: winnerUsername =
		resolvedWinner === null || resolvedWinner === 'DRAW'
			? null
			: ($gameStateStore?.playerUsernames?.[resolvedWinner] ?? resolvedWinner);
</script>

<div class="duel-stage-bg" aria-hidden="true"></div>

<CardFxFilters />

<div class="lb" class:lb--side-hand={sideHand}>
	<header class="lb__opp">
		<a href="/" class="lb__home" title={$t('duel.home')} aria-label={$t('duel.home')}>←</a>
		<div class="hud-id">
			<div class="avatar">{opponentLooksLikeBot ? '🤖' : '👤'}</div>
			<div>
				<div class="nm">{playerBUsername}</div>
				{#if opponentLooksLikeBot}<span class="hud-tag hud-tag--op">BOT</span>{/if}
			</div>
		</div>
		<div class="score-orb" title={$t('duel.roundsWon')}>
			<span class="orb-ic" aria-hidden="true">{@html trophyIconSvg}</span>
			<div class="v">{roundsWonB}</div>
		</div>
		<div class="score-orb" title={$t('duel.cardsLeft')}>
			<span class="orb-ic" aria-hidden="true">{@html cardsIconSvg}</span>
			<div class="v">{deckB}</div>
		</div>
		<div class="lb__oparc" bind:this={opponentDeckAnchorElement}>
			<div
				bind:this={opponentHandContainerElement}
				style="position:absolute;inset:0;pointer-events:none;"
			></div>
			{#each Array.from({ length: Math.min(oppHandCount || 0, 7) }) as _, i (i)}
				{@const n = Math.min(oppHandCount || 0, 7)}
				{@const off = i - (n - 1) / 2}
				<div
					class="lb__oparc-card"
					style={`transform: translateX(calc(-50% + ${off * 19}px)); z-index:${i};`}
					title={$t('duel.opponentCard')}
				>
					<img src="/frames/card-back.png" alt="" loading="lazy" decoding="async" />
				</div>
			{/each}
		</div>
	</header>

	<section class="lb__table">
		<!-- Circular battlefield arena: the played card's creature ART is masked into the felt
		     circle (background) with rotating arcane rings, and the WHOLE card is shown on TOP for
		     clarity (name + attributes). Your half (bottom) fills on pick; the opponent's half (top)
		     reveals on REVEAL. The opponent's card-back is shown UPRIGHT (the on-top flip card). -->
		<div class="lb__arena-rings" aria-hidden="true">
			<span class="lb__arena-ring lb__arena-ring--1"></span>
			<span class="lb__arena-ring lb__arena-ring--2"></span>
			<span class="lb__arena-ring lb__arena-ring--3"></span>
		</div>
		<div class="lb__arena">
			<div class={`lb__arena-half lb__arena-half--opp ${oppOutcome ? 'is-' + oppOutcome : ''}`}>
				{#if oppArt && oppRevealed}
					<img
						class="lb__arena-art"
						src={oppArt}
						alt={oppName}
						data-cycle={centerRevealCycle}
						decoding="async"
					/>
				{/if}
			</div>
			<div class={`lb__arena-half lb__arena-half--you ${youOutcome ? 'is-' + youOutcome : ''}`}>
				{#if youArt}
					<img class="lb__arena-art" src={youArt} alt={youName} decoding="async" />
				{/if}
			</div>
			<div class="lb__arena-seam" aria-hidden="true"></div>
		</div>

		<!-- Whole cards on TOP (clarity): opponent (flip — upright card-back until REVEAL) / VS / you. -->
		<div class="lb__center">
			<div class="lb__center-slot">
				{#if oppCardCode}
					<div class="flip-wrap" data-cycle={centerRevealCycle}>
						<div
							class="flipper"
							class:start-back={currentDuelStage !== 'REVEAL'}
							class:animate={currentDuelStage === 'REVEAL'}
							style={`--flip-ms:${FLIP_MS}ms;`}
						>
							<div class="face front">
								<div
									bind:this={centerSlotBElement}
									class={`result-wrap ${currentDuelStage === 'REVEAL' && currentDuelRoundWinner === playerB ? 'winner-glow' : currentDuelStage === 'REVEAL' && currentDuelRoundWinner && currentDuelRoundWinner !== playerB ? 'loser-shake' : ''}`}
								>
									<CardComposite
										artImageUrl={oppCard?.imageUrl ?? ''}
										frameImageUrl={frameOverlayImageUrl ?? '/frames/default.png'}
										titleImageUrl={titleOverlayImageUrl}
										titleText={oppCard?.name ?? oppCardCode}
										aspectWidth={1444}
										aspectHeight={1920}
										artObjectFit="cover"
										enableTilt={false}
										descriptionText={oppCard?.description ?? ''}
										magicValue={oppCard?.magic ?? 0}
										mightValue={oppCard?.might ?? 0}
										fireValue={oppCard?.fire ?? 0}
										cornerNumberValue={oppCard?.number ?? 0}
									/>
								</div>
							</div>
							<div class="face back">
								<img
									src={cardBackImageUrl}
									alt="hidden"
									style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:10px;display:block;"
									loading="lazy"
									decoding="async"
								/>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<div class="lb__center-vs vs" class:clash={currentDuelStage === 'REVEAL'} aria-hidden="true">
				<span class="vs__spark"></span>
				<span class="vs__disc">VS</span>
			</div>

			<div class="lb__center-slot" class:slot-removable={canReturnSelectedCardToHand}>
				{#if youCardCode}
					<div
						bind:this={centerSlotAElement}
						class={`result-wrap ${currentDuelStage === 'REVEAL' && currentDuelRoundWinner === playerA ? 'winner-glow' : currentDuelStage === 'REVEAL' && currentDuelRoundWinner && currentDuelRoundWinner !== playerA ? 'loser-shake' : ''}`}
						role="button"
						tabindex="0"
						on:click={onCenterCardReturnToHand}
						on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && onCenterCardReturnToHand()}
						title={canReturnSelectedCardToHand ? $t('duel.returnCard') : ''}
					>
						<CardComposite
							artImageUrl={youCard?.imageUrl ?? ''}
							frameImageUrl={frameOverlayImageUrl ?? '/frames/default.png'}
							titleImageUrl={titleOverlayImageUrl}
							titleText={youCard?.name ?? youCardCode}
							aspectWidth={1444}
							aspectHeight={1920}
							artObjectFit="cover"
							enableTilt={false}
							descriptionText={youCard?.description ?? ''}
							magicValue={youCard?.magic ?? 0}
							mightValue={youCard?.might ?? 0}
							fireValue={youCard?.fire ?? 0}
							cornerNumberValue={youCard?.number ?? 0}
						/>
					</div>
				{/if}
			</div>
		</div>

		{#if roundBanner}
			<div class={`round-banner lb__round-banner ${roundBanner.tone}`}>
				<span class="round-banner-icon">{roundBanner.icon}</span>
				<span class="round-banner-text">{roundBanner.text}</span>
			</div>
		{/if}

		<div class="lb__notices">
			{#if duelStage === 'PICK_ATTRIBUTE' && chooserId === playerA}
				<div class="notice chooser" style="text-align:center;">
					<div>
						<button
							class="btn attribute-option"
							class:attribute-highlight={isHighlightedAttribute('magic')}
							disabled={isGameOver()}
							on:click={() => chooseAttr('magic')}
							title={$t('duel.chooseMagic', { value: chooserCardDetails?.magic ?? '–' })}
							aria-label={$t('duel.chooseMagic', { value: chooserCardDetails?.magic ?? '–' })}
						>
							<img src="/icons/magic_icon.png" alt="Magic icon" loading="lazy" decoding="async" />
							{#if chooserCardDetails}
								<span class="attribute-value">{chooserCardDetails.magic}</span>
							{/if}
						</button>
						<button
							class="btn attribute-option"
							class:attribute-highlight={isHighlightedAttribute('might')}
							disabled={isGameOver()}
							on:click={() => chooseAttr('might')}
							title={$t('duel.chooseMight', { value: chooserCardDetails?.might ?? '–' })}
							aria-label={$t('duel.chooseMight', { value: chooserCardDetails?.might ?? '–' })}
						>
							<img
								src="/icons/strength_icon.png"
								alt="Might icon"
								loading="lazy"
								decoding="async"
							/>
							{#if chooserCardDetails}
								<span class="attribute-value">{chooserCardDetails.might}</span>
							{/if}
						</button>
						<button
							class="btn attribute-option"
							class:attribute-highlight={isHighlightedAttribute('fire')}
							disabled={isGameOver()}
							on:click={() => chooseAttr('fire')}
							title={$t('duel.chooseFire', { value: chooserCardDetails?.fire ?? '–' })}
							aria-label={$t('duel.chooseFire', { value: chooserCardDetails?.fire ?? '–' })}
						>
							<img src="/icons/fire_icon.png" alt="Fire icon" loading="lazy" decoding="async" />
							{#if chooserCardDetails}
								<span class="attribute-value">{chooserCardDetails.fire}</span>
							{/if}
						</button>
					</div>
				</div>
			{:else if duelStage === 'PICK_ATTRIBUTE'}
				<div class="notice warn" style="margin-top:12px; text-align:center;">
					{$t('duel.waitingForAttribute', { name: chooserUsername })}
				</div>
			{/if}
		</div>

		<aside class="lb__log">
			<DuelHistory
				items={duelHistoryItems}
				resolveCard={resolveDuelHistoryCard}
				playerLabel={$t('duel.you')}
				opponentLabel={playerBUsername}
				{cardBackImageUrl}
			/>
		</aside>
	</section>

	{#if resolvedWinner !== null && endOutcome}
		<div class="endscreen-overlay">
			<div class={`endscreen-card ${endOutcome}`}>
				<div class="endscreen-emblem">
					{endOutcome === 'win' ? '🏆' : endOutcome === 'lose' ? '💀' : '🤝'}
				</div>
				<h2 class="endscreen-title">
					{endOutcome === 'win'
						? $t('duel.victory')
						: endOutcome === 'lose'
							? $t('duel.defeat')
							: $t('duel.draw')}
				</h2>
				<p class="endscreen-sub">
					{#if endOutcome === 'draw'}
						{$t('duel.drawSub')}
					{:else}
						{$t('duel.winnerSub', { name: winnerUsername })}
					{/if}
				</p>
				<div class="endscreen-scoreline">
					<div class="score-side you">
						<span class="score-num">{roundsWonA}</span>
						<span class="score-lbl">{$t('duel.you')}</span>
					</div>
					<span class="score-dash">–</span>
					<div class="score-side opp">
						<span class="score-num">{roundsWonB}</span>
						<span class="score-lbl">{playerBUsername}</span>
					</div>
				</div>
				<div class="endscreen-actions">
					<button class="endscreen-btn primary" type="button" on:click={playAnotherDuel}>
						<UiIcon name="play" />
						{$t('duel.playAgain')}
					</button>
					<a class="endscreen-btn ghost" href="/"><UiIcon name="home" /> {$t('duel.home')}</a>
				</div>
			</div>
		</div>
	{/if}

	<section class="lb__you">
		<div class="lb__you-hud">
			<button
				class="lb__layout-toggle"
				class:on={sideHand}
				type="button"
				on:click={toggleSideHand}
				title={$t('duel.toggleLayout')}
				aria-label={$t('duel.toggleLayout')}
			>
				<UiIcon name="layout" />
			</button>
			<div class="hud-id">
				<div class="avatar">
					{#if $authUser?.avatarUrl}<img src={$authUser.avatarUrl} alt="" />{:else}🧙{/if}
				</div>
				<div>
					<div class="nm">{playerAUsername}</div>
				</div>
			</div>
			<div class="score-orb" title={$t('duel.roundsWon')}>
				<span class="orb-ic" aria-hidden="true">{@html trophyIconSvg}</span>
				<div class="v">{roundsWonA}</div>
			</div>
			<div class="score-orb" title={$t('duel.cardsLeft')}>
				<span class="orb-ic" aria-hidden="true">{@html cardsIconSvg}</span>
				<div class="v">{deckA}</div>
			</div>
		</div>

		<div
			bind:this={playerDeckAnchorElement}
			style="position:absolute;left:30px;bottom:30px;width:1px;height:1px;"
		></div>

		<div
			class="hand my-hand fan"
			bind:this={myHandContainerElement}
			style={`--spread-override:${myHandCardSpreadPixels ? myHandCardSpreadPixels + 'px' : ''}`}
		>
			{#each playerHandCardItems as it, i (it.uid)}
				{#key it.uid}
					<button
						type="button"
						class="card-socket focus:outline-none"
						disabled={Boolean($gameStateStore?.winner)}
						style={`width:${cardWidthCssValue}; --i:${i}; --n:${playerHandCardItems.length}; ${$gameStateStore?.winner ? 'opacity:.6;cursor:not-allowed;' : ''}${pendingHiddenUidSet.has(it.uid) ? ';visibility:hidden;' : ''}`}
						title={$t('duel.play', { name: it.name ?? it.code })}
						on:click={(e) => onHandCardClick(e, it.code)}
					>
						<div class="flip-wrap" data-cycle={autoFlipCycleCounter}>
							<div
								class="flipper"
								class:animate={pendingCardRevealUidSet.has(it.uid)}
								class:start-back={pendingCardRevealUidSet.has(it.uid)}
								on:animationend={() => clearPendingFlipFor(it.uid)}
								style={`--flip-ms:${FLIP_MS}ms;`}
							>
								<div class="face front">
									<CardComposite
										artImageUrl={it.imageUrl ?? ''}
										frameImageUrl={frameOverlayImageUrl ?? '/frames/default.png'}
										titleImageUrl={titleOverlayImageUrl}
										titleText={it.name ?? it.code}
										aspectWidth={1444}
										aspectHeight={1920}
										artObjectFit="cover"
										enableTilt={true}
										descriptionText={it.description ?? ''}
										magicValue={it.magic ?? 0}
										mightValue={it.might ?? 0}
										fireValue={it.fire ?? 0}
										cornerNumberValue={it.number ?? 0}
									/>
								</div>
								<div class="face back">
									<img
										src="/frames/card-back.png"
										alt="card-back"
										style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:10px;display:block;"
										loading="lazy"
										decoding="async"
									/>
								</div>
							</div>
						</div>
					</button>
				{/key}
			{/each}
		</div>

		<div class="lb__you-actions">
			{#if showDuelCountdown}
				<div class={`turn-timer ${duelCountdownCritical ? 'critical' : ''}`}>
					<span class="label">{duelTimerLabel}</span>
					<span class="time">{duelCountdownText}</span>
				</div>
			{/if}
			{#if resolvedWinner === null}
				<button
					type="button"
					class="surrender-button"
					on:click={surrenderDuelGame}
					disabled={!$authUser}
				>
					<UiIcon name="surrender" />
					{$t('duel.surrender')}
				</button>
			{/if}
		</div>
	</section>
</div>

<div class="fx-layer" bind:this={fxLayerElement}></div>
