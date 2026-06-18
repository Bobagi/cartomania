<script lang="ts">
	import { createEventDispatcher, onDestroy, onMount, tick } from 'svelte';

	import {
		blockCartomaniaPlayer,
		fetchCartomaniaFriendChat,
		listCartomaniaFriendRequests,
		listCartomaniaFriends,
		respondCartomaniaFriendRequest,
		searchCartomaniaPlayers,
		sendCartomaniaFriendMessage,
		sendCartomaniaFriendRequest,
		removeCartomaniaFriend,
		startCartomaniaGameWithFriend,
		type CartomaniaFriendChatMessage,
		type CartomaniaFriendSummary,
		type CartomaniaIncomingFriendRequest,
		type CartomaniaPlayerSummary,
		type GameMode
	} from '$lib/api/GameClient';
	import '$lib/styles/components/FriendsPanel.css';

	const dispatch = createEventDispatcher<{
		close: void;
		navigateToGame: { gameId: string; mode: GameMode };
		refreshDashboard: void;
	}>();

	export let currentUserId: string;

	type Tab = 'amigos' | 'pedidos' | 'buscar';

	let tab: Tab = 'amigos';
	let friends: CartomaniaFriendSummary[] = [];
	let requests: CartomaniaIncomingFriendRequest[] = [];
	let searchTerm = '';
	let searchResults: CartomaniaPlayerSummary[] = [];
	let searchInFlight = false;
	let dockFriendId: string | null = null;
	let chatMessages: CartomaniaFriendChatMessage[] = [];
	let chatDraft = '';
	let chatLoading = false;
	let menuOpenId: string | null = null;
	let leaving: Record<string, boolean> = {};
	let duelSent: Record<string, boolean> = {};
	let addSent: Record<string, boolean> = {};
	let toast: { txt: string; ok: boolean } | null = null;
	let msgsEl: HTMLDivElement | null = null;

	const timers: ReturnType<typeof setTimeout>[] = [];
	let refreshInterval: ReturnType<typeof setInterval> | null = null;
	let chatInterval: ReturnType<typeof setInterval> | null = null;

	function after(ms: number, fn: () => void) {
		const t = setTimeout(fn, ms);
		timers.push(t);
		return t;
	}

	function presenceStatus(lastSeenAt: string | null | undefined): 'online' | 'away' | 'offline' {
		if (!lastSeenAt) return 'offline';
		const diff = Date.now() - new Date(lastSeenAt).getTime();
		if (diff < 2 * 60 * 1000) return 'online';
		if (diff < 10 * 60 * 1000) return 'away';
		return 'offline';
	}

	function presenceLabel(lastSeenAt: string | null | undefined): string {
		if (!lastSeenAt) return 'Offline';
		const diff = Date.now() - new Date(lastSeenAt).getTime();
		if (diff < 2 * 60 * 1000) return 'Online';
		const mins = Math.floor(diff / 60000);
		if (mins < 60) return `Visto há ${mins} min`;
		const hrs = Math.floor(mins / 60);
		return `Visto há ${hrs} h`;
	}

	function showToast(txt: string, ok = false) {
		toast = { txt, ok };
		after(2400, () => {
			toast = null;
		});
	}

	function avatarLetter(name: string) {
		return name.charAt(0).toUpperCase();
	}

	function avatarTint(name: string) {
		const colors = ['#9b59b6', '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#1abc9c', '#e91e63'];
		let h = 0;
		for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
		return colors[Math.abs(h) % colors.length];
	}

	function formatHora(iso: string) {
		const d = new Date(iso);
		if (isNaN(d.getTime())) return '';
		return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	async function scrollMsgs() {
		await tick();
		if (msgsEl) msgsEl.scrollTop = msgsEl.scrollHeight;
	}

	$: acceptedFriends = friends.filter((f) => f.status === 'ACCEPTED' && !f.blockedByMe);
	$: docked = dockFriendId
		? acceptedFriends.find((f) => f.friendshipId === dockFriendId) ?? null
		: null;
	$: filteredResults = searchResults.filter(
		(p) =>
			p.id !== currentUserId && !acceptedFriends.some((f) => f.friend.id === p.id)
	);

	async function loadData() {
		try {
			const [fl, rl] = await Promise.all([listCartomaniaFriends(), listCartomaniaFriendRequests()]);
			friends = fl;
			requests = rl;
			// If docked friend is no longer valid, close dock
			if (dockFriendId && !fl.some((f) => f.friendshipId === dockFriendId)) {
				dockFriendId = null;
				chatMessages = [];
			}
		} catch (e) {
			console.error('Failed to load friends data', e);
		}
	}

	async function refreshChat() {
		if (!dockFriendId || !docked) return;
		try {
			const history = await fetchCartomaniaFriendChat(docked.friend.id);
			const incoming = history.messages ?? [];
			if (incoming.length > chatMessages.length) {
				chatMessages = incoming;
				await scrollMsgs();
			}
		} catch {}
	}

	onMount(async () => {
		await loadData();
		refreshInterval = setInterval(() => void loadData(), 8000);
		chatInterval = setInterval(() => void refreshChat(), 3000);
	});

	onDestroy(() => {
		timers.forEach(clearTimeout);
		if (refreshInterval) clearInterval(refreshInterval);
		if (chatInterval) clearInterval(chatInterval);
	});

	async function handleAccept(r: CartomaniaIncomingFriendRequest) {
		leaving = { ...leaving, [r.friendshipId]: true };
		after(320, async () => {
			try {
				await respondCartomaniaFriendRequest(r.friendshipId, true);
				await loadData();
				dispatch('refreshDashboard');
				showToast('Pedido aceite! Novo aliado adicionado.', true);
			} catch (e) {
				console.error('Accept failed', e);
				leaving = { ...leaving, [r.friendshipId]: false };
			}
		});
	}

	async function handleDecline(r: CartomaniaIncomingFriendRequest) {
		leaving = { ...leaving, [r.friendshipId]: true };
		after(320, async () => {
			try {
				await respondCartomaniaFriendRequest(r.friendshipId, false);
				await loadData();
			} catch (e) {
				console.error('Decline failed', e);
				leaving = { ...leaving, [r.friendshipId]: false };
			}
		});
	}

	async function handleRemove(f: CartomaniaFriendSummary) {
		menuOpenId = null;
		leaving = { ...leaving, [f.friendshipId]: true };
		after(320, async () => {
			try {
				await removeCartomaniaFriend(f.friendshipId);
				if (dockFriendId === f.friendshipId) {
					dockFriendId = null;
					chatMessages = [];
				}
				await loadData();
				dispatch('refreshDashboard');
				showToast('Amigo removido.', false);
			} catch (e) {
				console.error('Remove failed', e);
				leaving = { ...leaving, [f.friendshipId]: false };
			}
		});
	}

	async function handleBlock(f: CartomaniaFriendSummary) {
		menuOpenId = null;
		leaving = { ...leaving, [f.friendshipId]: true };
		after(320, async () => {
			try {
				await blockCartomaniaPlayer(f.friend.id);
				if (dockFriendId === f.friendshipId) {
					dockFriendId = null;
					chatMessages = [];
				}
				await loadData();
				dispatch('refreshDashboard');
				showToast('Jogador bloqueado.', false);
			} catch (e) {
				console.error('Block failed', e);
				leaving = { ...leaving, [f.friendshipId]: false };
			}
		});
	}

	async function handleDuel(f: CartomaniaFriendSummary) {
		duelSent = { ...duelSent, [f.friendshipId]: true };
		showToast('Duelo iniciado!', true);
		try {
			const { gameId } = await startCartomaniaGameWithFriend(f.friend.id, 'ATTRIBUTE_DUEL');
			dispatch('navigateToGame', { gameId, mode: 'ATTRIBUTE_DUEL' });
		} catch (e) {
			console.error('Start duel failed', e);
			showToast('Erro ao iniciar duelo.', false);
		}
		after(3000, () => {
			duelSent = { ...duelSent, [f.friendshipId]: false };
		});
	}

	async function openChat(f: CartomaniaFriendSummary) {
		dockFriendId = f.friendshipId;
		chatLoading = true;
		chatMessages = [];
		try {
			const history = await fetchCartomaniaFriendChat(f.friend.id);
			chatMessages = history.messages ?? [];
			await scrollMsgs();
		} catch (e) {
			console.error('Chat load failed', e);
		} finally {
			chatLoading = false;
		}
	}

	async function sendMsg() {
		if (!docked || !chatDraft.trim()) return;
		const text = chatDraft.trim();
		chatDraft = '';
		try {
			const msg = await sendCartomaniaFriendMessage(docked.friend.id, text);
			chatMessages = [...chatMessages, msg];
			await scrollMsgs();
		} catch (e) {
			console.error('Send message failed', e);
		}
	}

	let searchDebounce: ReturnType<typeof setTimeout> | null = null;
	function handleSearch() {
		if (searchDebounce) clearTimeout(searchDebounce);
		searchDebounce = setTimeout(async () => {
			const term = searchTerm.trim();
			if (!term) {
				searchResults = [];
				return;
			}
			searchInFlight = true;
			try {
				searchResults = await searchCartomaniaPlayers(term);
			} catch (e) {
				console.error('Search failed', e);
			} finally {
				searchInFlight = false;
			}
		}, 320);
	}

	async function handleAdd(p: CartomaniaPlayerSummary) {
		addSent = { ...addSent, [p.id]: true };
		try {
			await sendCartomaniaFriendRequest(p.id);
			showToast('Pedido de amizade enviado!', true);
		} catch (e) {
			console.error('Add failed', e);
			showToast('Erro ao enviar pedido.', false);
			addSent = { ...addSent, [p.id]: false };
		}
	}
</script>

<svelte:window
	on:click={() => {
		if (menuOpenId) menuOpenId = null;
	}}
/>

<!-- Backdrop + modal -->
<div class="fr-backdrop" role="dialog" aria-modal="true">
	<div class="fr-modal density-compacta" on:click|stopPropagation>
		<!-- Header -->
		<header class="fr-head">
			<h1 class="fr-title">Aliados e Rivais</h1>
			<span class="fr-online-now">
				<i></i>{acceptedFriends.length} online agora
			</span>
			<button type="button" class="pill pill--ghost" on:click={() => dispatch('close')}>
				✕ Fechar
			</button>
		</header>

		<!-- Tabs -->
		<nav class="fr-tabs">
			<button
				type="button"
				class="fr-tab"
				class:is-active={tab === 'amigos'}
				on:click={() => (tab = 'amigos')}
			>
				Amigos
				<span class="n">{acceptedFriends.length}</span>
			</button>
			<button
				type="button"
				class="fr-tab"
				class:is-active={tab === 'pedidos'}
				on:click={() => (tab = 'pedidos')}
			>
				Pedidos
				{#if requests.length > 0}
					<span class="badge">{requests.length}</span>
				{:else}
					<span class="n">0</span>
				{/if}
			</button>
			<button
				type="button"
				class="fr-tab"
				class:is-active={tab === 'buscar'}
				on:click={() => (tab = 'buscar')}
			>
				Buscar
			</button>
		</nav>

		<!-- Body -->
		<div class="fr-body">
			<div class="fr-main">
				<!-- Tab: Amigos -->
				{#if tab === 'amigos'}
					<div class="fr-scroll">
						<div class="fr-group-label">
							Aliados <span class="n">{acceptedFriends.length}</span>
						</div>
						{#if acceptedFriends.length === 0}
							<div class="fr-empty">
								<div class="glyph">⚔️</div>
								<h3>Sem aliados ainda</h3>
								<p>Busca jogadores e envia pedidos de amizade para formar seus aliados.</p>
							</div>
						{:else}
							<div class="fr-list">
								{#each acceptedFriends as f (f.friendshipId)}
									<div
										class="fr-row"
										class:is-leaving={leaving[f.friendshipId]}
										class:menu-open={menuOpenId === f.friendshipId}
									>
										<!-- Avatar -->
										<span
											class="fr-avatar"
											style="--tint:{avatarTint(f.friend.username)}"
										>
											{#if f.friend.avatarUrl}
												<img
													src={f.friend.avatarUrl}
													alt={f.friend.username}
													style="width:100%;height:100%;border-radius:50%;object-fit:cover;"
												/>
											{:else}
												{avatarLetter(f.friend.username)}
											{/if}
											<span class="fr-dot" data-presence={presenceStatus(f.friend.lastSeenAt)}></span>
										</span>

										<!-- Info -->
										<div class="who">
											<div class="nome">{f.friend.username}</div>
											<div class="fr-status" data-presence={presenceStatus(f.friend.lastSeenAt)}>{presenceLabel(f.friend.lastSeenAt)}</div>
										</div>

										<!-- Actions -->
										<div class="fr-actions">
											<button
												type="button"
												class="btn-duel fade"
												class:sent={duelSent[f.friendshipId]}
												disabled={!!duelSent[f.friendshipId]}
												on:click|stopPropagation={() => handleDuel(f)}
											>
												{#if duelSent[f.friendshipId]}
													✓ Enviado
												{:else}
													⚔ Duelar
												{/if}
											</button>

											<button
												type="button"
												class="btn-icon fade"
												title="Abrir chat"
												on:click|stopPropagation={() => openChat(f)}
											>
												<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
													<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
												</svg>
											</button>

											<div class="fr-menu-wrap">
												<button
													type="button"
													class="btn-icon fade"
													title="Mais opções"
													on:click|stopPropagation={() => {
														menuOpenId = menuOpenId === f.friendshipId ? null : f.friendshipId;
													}}
												>
													<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
														<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
														<circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
														<circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" />
													</svg>
												</button>
												{#if menuOpenId === f.friendshipId}
													<div class="fr-menu" on:click|stopPropagation>
														<button type="button" on:click={() => handleRemove(f)}>
															<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
																<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
															</svg>
															Remover amigo
														</button>
														<div class="sep"></div>
														<button type="button" class="danger" on:click={() => handleBlock(f)}>
															<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;">
																<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>
															</svg>
															Bloquear
														</button>
													</div>
												{/if}
											</div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Tab: Pedidos -->
				{#if tab === 'pedidos'}
					<div class="fr-scroll">
						<div class="fr-group-label">
							Pedidos recebidos <span class="n">{requests.length}</span>
						</div>
						{#if requests.length === 0}
							<div class="fr-empty">
								<div class="glyph">📬</div>
								<h3>Nenhum pedido</h3>
								<p>Quando alguém te convidar, o pedido aparecerá aqui.</p>
							</div>
						{:else}
							<div class="fr-list">
								{#each requests as r (r.friendshipId)}
									<div class="fr-req" class:is-leaving={leaving[r.friendshipId]}>
										<!-- Avatar (no avatarUrl on requester) -->
										<span
											class="fr-avatar"
											style="--tint:{avatarTint(r.requester.username)}"
										>
											{avatarLetter(r.requester.username)}
										</span>

										<!-- Info -->
										<div class="who">
											<div class="nome" style="font-size:15px;font-weight:800;">{r.requester.username}</div>
											<div class="meta">
												Pedido enviado <b>{new Date(r.createdAt).toLocaleDateString()}</b>
											</div>
										</div>

										<!-- Actions -->
										<div class="fr-req-actions">
											<button
												type="button"
												class="btn-accept"
												on:click={() => handleAccept(r)}
											>
												Aceitar
											</button>
											<button
												type="button"
												class="btn-decline"
												on:click={() => handleDecline(r)}
											>
												Recusar
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Tab: Buscar -->
				{#if tab === 'buscar'}
					<div class="fr-scroll">
						<div class="fr-search-bar">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>
							</svg>
							<input
								type="text"
								placeholder="Buscar jogadores..."
								bind:value={searchTerm}
								on:input={handleSearch}
							/>
						</div>

						{#if searchInFlight}
							<div class="fr-empty" style="padding:24px 30px;">
								<p>Buscando...</p>
							</div>
						{:else if searchTerm.trim() && filteredResults.length === 0}
							<div class="fr-empty">
								<div class="glyph">🔍</div>
								<h3>Nenhum resultado</h3>
								<p>Tente outro nome.</p>
							</div>
						{:else if filteredResults.length > 0}
							<div class="fr-group-label">
								Resultados <span class="n">{filteredResults.length}</span>
							</div>
							<div class="fr-list">
								{#each filteredResults as p (p.id)}
									<div class="fr-req">
										<span
											class="fr-avatar"
											style="--tint:{avatarTint(p.username)}"
										>
											{avatarLetter(p.username)}
										</span>

										<div class="who">
											<div class="nome" style="font-size:15px;font-weight:800;">{p.username}</div>
										</div>

										<button
											type="button"
											class="btn-add"
											class:sent={addSent[p.id]}
											disabled={!!addSent[p.id]}
											on:click={() => handleAdd(p)}
										>
											{#if addSent[p.id]}
												✓ Enviado
											{:else}
												+ Adicionar
											{/if}
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Chat dock (fixed bottom-right) -->
{#if docked}
	<div class="fr-dock">
		<div class="fr-dock-head">
			<span
				class="fr-avatar"
				style="--tint:{avatarTint(docked.friend.username)}"
			>
				{#if docked.friend.avatarUrl}
					<img
						src={docked.friend.avatarUrl}
						alt={docked.friend.username}
						style="width:100%;height:100%;border-radius:50%;object-fit:cover;"
					/>
				{:else}
					{avatarLetter(docked.friend.username)}
				{/if}
			</span>
			<div class="who">
				<div class="nome">{docked.friend.username}</div>
				<div class="fr-status">Offline</div>
			</div>
			<button
				type="button"
				class="btn-icon"
				title="Fechar chat"
				on:click={() => {
					dockFriendId = null;
					chatMessages = [];
				}}
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M18 6 6 18"/><path d="m6 6 12 12"/>
				</svg>
			</button>
		</div>

		<div class="fr-chat">
			<div class="fr-msgs" bind:this={msgsEl}>
				{#if chatLoading}
					<div class="fr-chat-empty">Carregando mensagens...</div>
				{:else if chatMessages.length === 0}
					<div class="fr-chat-empty">Nenhuma mensagem ainda. Diga olá!</div>
				{:else}
					{#each chatMessages as m (m.id ?? m.createdAt + m.body)}
						<div class="fr-msg {m.senderId === currentUserId ? 'eu' : 'eles'}">
							<div class="bubble">{m.body}</div>
							<span class="hora">{formatHora(m.createdAt)}</span>
						</div>
					{/each}
				{/if}
			</div>

			<div class="fr-chat-input">
				<input
					type="text"
					placeholder="Mensagem..."
					bind:value={chatDraft}
					on:keydown={(e) => {
						if (e.key === 'Enter') sendMsg();
					}}
				/>
				<button
					type="button"
					class="btn-send"
					disabled={!chatDraft.trim()}
					on:click={sendMsg}
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>
					</svg>
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Toast -->
{#if toast}
	<div class="fr-toast" class:ok={toast.ok}>
		<span class="ico">{toast.ok ? '✓' : '⚔'}</span>
		{toast.txt}
	</div>
{/if}
