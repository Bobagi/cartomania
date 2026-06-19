// Português (Brasil)
import type en from './en';

const pt: typeof en = {
	language: {
		change: 'Mudar idioma'
	},
	common: {
		back: 'Voltar'
	},
	nav: {
		logout: 'Sair'
	},
	footer: {
		tagline: 'Batalhas estratégicas de cartas mitológicas no seu navegador.',
		community: 'Comunidade',
		privacy: 'Privacidade',
		terms: 'Termos',
		rights: '© {year} Cartomania',
		fanMade:
			'Cartomania é um jogo fan-made, sem fins comerciais, baseado na coleção de cartas Dracomania. Não tem afiliação, patrocínio ou endosso dos criadores originais de Dracomania.'
	},
	home: {
		kicker: 'Duelo de Cartas Colecionáveis',
		tagline:
			'Comande a coleção Dracomania e duele por fogo, magia e força. A cada rodada os dois duelistas revelam uma carta e se enfrentam em um atributo — capture mais cartas que seu rival para vencer a partida.',
		serverLabel: 'Servidor',
		auth: {
			title: 'Entre na arena',
			subtitle: 'Faça login para jogar, ou veja a coleção primeiro.',
			username: 'Usuário',
			usernamePlaceholder: 'Seu apelido',
			password: 'Senha',
			login: 'Entrar',
			or: 'ou',
			browseGallery: 'Ver a galeria',
			createAccount: 'Criar uma conta',
			invalidCredentials: 'Usuário ou senha inválidos.'
		},
		dashboard: {
			adminBadge: 'Admin',
			gallery: 'Galeria',
			friends: 'Amigos',
			expireOld: 'Expirar antigos',
			cardsLab: 'Lab de Cartas',
			readyTitle: 'Pronto para duelar?',
			readySub: 'Inicie um Duelo de Atributos contra o bot e aumente sua coleção de vitórias.',
			startDuel: 'Iniciar Duelo',
			yourGames: 'Seus jogos ativos',
			noGames: 'Nenhum jogo ativo ainda — inicie um duelo acima.',
			mode: 'Modo',
			updated: 'Atualizado',
			resume: 'Retomar',
			openGame: 'Abrir jogo',
			finishGame: 'Encerrar o jogo',
			allGames: 'Todos os jogos ativos (admin)',
			noServerGames: 'Nenhum jogo ativo no servidor.',
			players: 'Jogadores',
			open: 'Abrir',
			stats: {
				wins: 'Vitórias',
				played: 'Partidas jogadas',
				draws: 'Empates',
				active: 'Jogos ativos',
				rank: 'Rank',
				lastActivity: 'Última atividade'
			}
		}
	},
	gallery: {
		home: 'Início',
		title: 'Coleções',
		subtitle: 'Clique em uma carta para ampliá-la.',
		loading: 'Carregando cartas…',
		error: 'Erro: {message}',
		noCollections: 'Nenhuma coleção encontrada.',
		noCards: 'Nenhuma carta encontrada nesta coleção.',
		cardCount: '{count} cartas',
		close: 'Fechar',
		card: 'Carta',
		stats: {
			magic: 'Magia',
			might: 'Força',
			fire: 'Fogo'
		}
	},
	register: {
		title: 'Crie sua conta',
		subtitle: 'É rápido e gratuito.',
		username: 'Usuário',
		usernamePlaceholder: 'Apelido',
		password: 'Senha',
		confirmPassword: 'Confirmar senha',
		submit: 'Criar conta',
		back: 'Voltar',
		errors: {
			usernameRequired: 'O usuário é obrigatório.',
			passwordRequired: 'A senha é obrigatória.',
			passwordMismatch: 'As senhas não coincidem.',
			generic: 'Não foi possível criar a conta.'
		}
	},
	auth: {
		googleContinue: 'Continuar com o Google',
		googleComingSoon: 'Login com Google em breve.'
	},
	attributes: {
		magic: 'Magia',
		might: 'Força',
		fire: 'Fogo'
	},
	duel: {
		home: 'Início',
		mode: 'Duelo de Atributos',
		surrender: 'Render-se',
		toggleLayout: 'Trocar layout (mão na lateral)',
		surrenderConfirm: 'Tem certeza de que deseja se render?',
		loginToSurrender: 'Faça login para se render.',
		roundsWon: 'Rodadas vencidas',
		cardsLeft: 'Cartas no baralho',
		opponentCard: 'Carta do oponente',
		returnCard: 'Devolver carta à mão',
		chooseAttribute: 'Escolha o atributo:',
		chooseMagic: 'Escolher magia ({value})',
		chooseMight: 'Escolher força ({value})',
		chooseFire: 'Escolher fogo ({value})',
		waitingForAttribute: 'Aguardando {name} escolher o atributo…',
		selectCard: 'Selecione uma carta da sua mão para enviar à batalha.',
		waiting: 'Aguardando…',
		yourCardHere: 'Sua carta entra aqui',
		you: 'Você',
		play: 'Jogar {name}',
		playAgain: 'Jogar de novo',
		timerChooseAttribute: 'Escolher atributo',
		timerOpponentChoosing: 'Oponente escolhendo',
		timerSelectCards: 'Selecionar cartas',
		roundTied: 'Rodada empatada!',
		roundYouWin: 'Você venceu a rodada!',
		roundOpponentWins: '{name} vence a rodada',
		victory: 'Vitória!',
		defeat: 'Derrota',
		draw: 'Empate',
		drawSub: 'O duelo terminou em empate perfeito.',
		winnerSub: '{name} vence a partida.',
		errorLoadState: 'Não foi possível carregar o estado do jogo',
		errorSurrender: 'Não foi possível se render.',
		playerSurrendered: 'Um jogador se rendeu.',
		historyTitle: 'Registro de Batalha',
		historyEmpty: 'Nenhuma rodada ainda — escolha uma carta para começar o duelo.',
		historyRound: 'Rodada {n}',
		historyLive: 'AO VIVO',
		historyTie: 'Empate',
		historyYouWinRound: 'Você vence a rodada',
		historyOppWinsRound: '{name} vence a rodada'
	},
	friends: {
		title: 'Aliados e Rivais',
		close: 'Fechar',
		closeAria: 'Fechar painel de amigos',
		searchTitle: 'Buscar jogadores',
		searchHint: 'Desafie alguém novo ou envie um pedido.',
		searchPlaceholder: 'Buscar nomes de usuário',
		searchAria: 'Buscar jogadores',
		search: 'Buscar',
		searching: 'Buscando…',
		noPlayers: 'Nenhum jogador encontrado.',
		you: 'Você',
		sendRequest: 'Enviar pedido',
		requestsTitle: 'Pedidos recebidos',
		requestsHint: 'Responda aos desafiantes que aguardam sua resposta.',
		noRequests: 'Nenhum pedido pendente.',
		accept: 'Aceitar',
		dismiss: 'Recusar',
		rosterTitle: 'Lista de amigos',
		rosterHint: 'Gerencie alianças, duelos e rivalidades.',
		noFriends: 'Você ainda não tem aliados. Envie um pedido acima.',
		blocked: 'Bloqueado',
		view: 'Ver',
		detailsTitle: 'Detalhes do amigo',
		detailsHint: 'Convide para uma batalha ou gerencie sua conexão.',
		selectFriend: 'Selecione um amigo para ver mais opções.',
		startClassic: 'Iniciar partida clássica',
		startDuel: 'Iniciar duelo',
		openChat: 'Abrir chat',
		removeFriend: 'Remover amigo',
		blockPlayer: 'Bloquear jogador',
		chatTitle: 'Chat de amigos',
		chatHint: 'Troque mensagens com seus aliados.',
		chatPickFriend: 'Escolha um amigo da lista para ver seu histórico de chat.',
		chatLoading: 'Carregando chat…',
		noMessages: 'Nenhuma mensagem ainda.',
		messagePlaceholder: 'Digite uma mensagem',
		send: 'Enviar',
		statusAccepted: 'Aceito',
		statusPending: 'Pendente',
		statusDeclined: 'Recusado',
		statusBlocked: 'Bloqueado',
		sessionExpired: 'Sua sessão do Cartomania expirou. Faça login novamente para gerenciar amigos.',
		missingTables:
			'O backend do Cartomania está sem as tabelas de amizade. Execute as migrations mais recentes do Prisma no Cartomania (ex.: pnpm prisma migrate deploy) e popule o banco antes de testar os recursos de amigos.',
		loadFail: 'Não foi possível carregar os dados de amigos.',
		searchFail: 'Falha ao buscar jogadores.',
		requestSent: 'Pedido de amizade enviado.',
		requestSendFail: 'Não foi possível enviar o pedido de amizade.',
		requestAccepted: 'Pedido de amizade aceito.',
		requestDismissed: 'Pedido de amizade recusado.',
		requestResolveFail: 'Não foi possível responder ao pedido de amizade.',
		friendRemoved: 'Amigo removido.',
		friendRemoveFail: 'Não foi possível remover o amigo.',
		playerBlocked: 'Jogador bloqueado.',
		playerBlockFail: 'Não foi possível bloquear o jogador.',
		chatLoadFail: 'Não foi possível carregar o histórico do chat.',
		messageSendFail: 'Não foi possível enviar a mensagem.',
		matchCreated: 'Partida criada.',
		matchStartFail: 'Não foi possível iniciar a partida com o amigo.'
	},
	legal: {
		back: 'Voltar ao Cartomania',
		kicker: 'Legal',
		updated: 'Última atualização: {date}',
		contactLink: 'repositório no GitHub',
		disclaimer:
			'O Cartomania é um projeto pessoal de portfólio, não um serviço comercial. Esta página é fornecida por transparência e não constitui aconselhamento jurídico.',
		privacy: {
			title: 'Política de Privacidade',
			intro:
				'O Cartomania é um projeto de portfólio gratuito e não comercial — um jogo de cartas colecionáveis digital criado para apresentar a coleção Dracomania. Esta página explica, em linguagem simples, quais informações o jogo manipula e por quê. Coletamos o mínimo possível e nunca vendemos seus dados.',
			contactHeading: 'Contato',
			contactText: 'Dúvidas sobre privacidade? Entre em contato pelo',
			sections: [
				{
					heading: 'Informações que coletamos',
					paragraphs: [],
					items: [
						{
							strong: 'Dados da conta',
							text: 'o nome de usuário que você escolhe e sua senha. As senhas são armazenadas apenas como um hash com sal; nunca guardamos nem exibimos o texto puro.'
						},
						{
							strong: 'Dados de jogo',
							text: 'as partidas que você joga, seus resultados e estatísticas agregadas como partidas jogadas, vencidas e empatadas.'
						},
						{
							strong: 'Dados sociais',
							text: 'pedidos de amizade, sua lista de amigos e as mensagens que você envia pelo painel de amigos do jogo.'
						},
						{
							strong: 'Dados técnicos',
							text: 'um cookie de sessão que mantém você conectado e um cookie que lembra seu idioma. Não usamos cookies de publicidade ou de rastreamento entre sites.'
						}
					]
				},
				{
					heading: 'Como usamos suas informações',
					paragraphs: [],
					items: [
						{ strong: '', text: 'Para criar sua conta e manter você conectado.' },
						{
							strong: '',
							text: 'Para executar partidas, conectar você com amigos e registrar resultados e estatísticas.'
						},
						{ strong: '', text: 'Para manter o serviço funcionando, seguro e livre de abusos.' }
					]
				},
				{
					heading: 'Cookies',
					paragraphs: [
						'O Cartomania usa apenas cookies essenciais e próprios: um para lembrar que você está conectado e outro para lembrar o idioma escolhido. O jogo não define cookies de análise ou publicidade de terceiros.'
					],
					items: []
				},
				{
					heading: 'Compartilhamento e terceiros',
					paragraphs: [
						'Não vendemos, alugamos nem trocamos suas informações pessoais. As artes das cartas são servidas a partir de bobagi.space, então carregá-las envolve uma requisição web padrão a esse host. O jogo roda na infraestrutura do próprio dono.'
					],
					items: []
				},
				{
					heading: 'Retenção de dados',
					paragraphs: [
						'Jogos inativos expiram e são limpos automaticamente. Os dados de conta e de jogo são mantidos enquanto sua conta existir. Você pode solicitar a exclusão da sua conta e dos dados associados a qualquer momento.'
					],
					items: []
				},
				{
					heading: 'Seus direitos',
					paragraphs: [
						'Você pode solicitar acesso, correção ou exclusão das informações associadas à sua conta. Por se tratar de um pequeno projeto pessoal, os pedidos são tratados manualmente, da melhor forma possível.'
					],
					items: []
				},
				{
					heading: 'Crianças',
					paragraphs: [
						'O Cartomania não é direcionado a crianças menores de 13 anos, e não coletamos informações delas de forma consciente.'
					],
					items: []
				},
				{
					heading: 'Alterações nesta política',
					paragraphs: [
						'Podemos atualizar esta política conforme o projeto evolui. Mudanças relevantes são refletidas na data de “última atualização” acima.'
					],
					items: []
				}
			]
		},
		terms: {
			title: 'Termos de Serviço',
			intro:
				'Bem-vindo ao Cartomania, um jogo de cartas colecionáveis digital gratuito e projeto pessoal de portfólio. Ao criar uma conta ou jogar, você concorda com estes termos. Se você não concordar, por favor não use o serviço.',
			contactHeading: 'Contato',
			contactText: 'Dúvidas sobre estes termos? Entre em contato pelo',
			sections: [
				{
					heading: 'O serviço',
					paragraphs: [
						'O Cartomania é fornecido gratuitamente, “no estado em que se encontra”, para fins de entretenimento e demonstração. É um projeto de hobby em evolução: recursos podem mudar e o jogo pode ficar indisponível ou ser descontinuado a qualquer momento, sem aviso.'
					],
					items: []
				},
				{
					heading: 'Sua conta',
					paragraphs: [],
					items: [
						{ strong: '', text: 'Você é responsável por manter sua senha e sua conta seguras.' },
						{ strong: '', text: 'Forneça informações precisas e não se passe por outras pessoas.' },
						{ strong: '', text: 'Você é responsável pela atividade que ocorre na sua conta.' }
					]
				},
				{
					heading: 'Uso aceitável',
					paragraphs: ['Você concorda em não:'],
					items: [
						{
							strong: '',
							text: 'Trapacear, explorar bugs ou usar bots ou scripts automatizados para jogar ou coletar dados do jogo.'
						},
						{
							strong: '',
							text: 'Assediar, ameaçar ou abusar de outros jogadores pelo chat ou qualquer outro recurso.'
						},
						{
							strong: '',
							text: 'Tentar interromper, sobrecarregar ou obter acesso não autorizado ao serviço ou a outras contas.'
						},
						{ strong: '', text: 'Usar o serviço para qualquer finalidade ilegal.' }
					]
				},
				{
					heading: 'Propriedade intelectual',
					paragraphs: [
						'O nome Cartomania, a coleção Dracomania e as artes das cartas pertencem ao seu dono. Fontes e outros recursos de terceiros continuam sendo propriedade de seus respectivos donos. O código-fonte do projeto é regido pela licença em seu repositório no GitHub. Você recebe um direito pessoal, não exclusivo e intransferível de jogar; nada aqui transfere a propriedade de qualquer conteúdo a você.'
					],
					items: []
				},
				{
					heading: 'Isenção de garantias',
					paragraphs: [
						'O serviço é fornecido sem garantias de qualquer tipo, expressas ou implícitas, incluindo adequação a um fim específico e operação ininterrupta ou livre de erros. Você o usa por sua conta e risco.'
					],
					items: []
				},
				{
					heading: 'Limitação de responsabilidade',
					paragraphs: [
						'Na máxima extensão permitida por lei, o projeto e seu dono não se responsabilizam por quaisquer danos indiretos, incidentais ou consequentes, nem por qualquer perda de dados decorrente do uso do serviço.'
					],
					items: []
				},
				{
					heading: 'Encerramento',
					paragraphs: [
						'Você pode parar de usar o Cartomania e solicitar a exclusão da conta a qualquer momento. Podemos suspender ou remover contas que violem estes termos ou para proteger o serviço e seus jogadores.'
					],
					items: []
				},
				{
					heading: 'Alterações nestes termos',
					paragraphs: [
						'Podemos atualizar estes termos conforme o projeto muda. O uso continuado após uma atualização significa que você aceita os termos revisados; a data de “última atualização” acima reflete a versão mais recente.'
					],
					items: []
				}
			]
		}
	},
	account: {
		navLabel: 'Conta',
		title: 'Configurações da conta',
		back: 'Voltar',
		chooseAvatar: 'Escolha seu avatar',
		save: 'Salvar',
		cancel: 'Cancelar',
		usernameTitle: 'Usuário',
		usernameHint: 'Seu nome de exibição e de login (3–50 caracteres).',
		newUsername: 'Novo nome de usuário',
		changeUsername: 'Alterar nome de usuário',
		passwordTitle: 'Senha',
		currentPassword: 'Senha atual',
		newPassword: 'Nova senha',
		confirmNewPassword: 'Confirmar nova senha',
		changePassword: 'Alterar senha',
		dangerTitle: 'Zona de perigo',
		deleteWarning:
			'Isto exclui permanentemente sua conta e todos os dados relacionados (jogos, amigos, mensagens). Não pode ser desfeito.',
		deleteAccount: 'Excluir conta',
		deleteConfirm: 'Sim, excluir minha conta',
		usernameUpdated: 'Nome de usuário atualizado.',
		passwordUpdated: 'Senha alterada.',
		avatarUpdated: 'Avatar atualizado.',
		passwordsDoNotMatch: 'As novas senhas não coincidem.',
		genericError: 'Algo deu errado. Tente novamente.'
	}
};

export default pt;
