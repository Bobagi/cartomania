// Español
import type en from './en';

const es: typeof en = {
	language: {
		change: 'Cambiar idioma'
	},
	common: {
		back: 'Volver'
	},
	nav: {
		logout: 'Cerrar sesión'
	},
	footer: {
		tagline: 'Batallas estratégicas de cartas mitológicas en tu navegador.',
		community: 'Comunidad',
		privacy: 'Privacidad',
		terms: 'Términos',
		rights: '© {year} Cartomania',
		fanMade:
			'Cartomania es un juego fan-made, sin fines comerciales, basado en la colección de cartas Dracomania. No está afiliado, patrocinado ni respaldado por los creadores originales de Dracomania.'
	},
	home: {
		kicker: 'Duelo de Cartas Coleccionables',
		tagline:
			'Comanda la colección Dracomania y duela por fuego, magia y fuerza. En cada ronda ambos duelistas revelan una carta y se enfrentan en un atributo: captura más cartas que tu rival para ganar la partida.',
		serverLabel: 'Servidor',
		auth: {
			title: 'Entra en la arena',
			subtitle: 'Inicia sesión para jugar, o explora la colección primero.',
			username: 'Usuario',
			usernamePlaceholder: 'Tu apodo',
			password: 'Contraseña',
			login: 'Iniciar sesión',
			or: 'o',
			browseGallery: 'Explorar la galería',
			createAccount: 'Crear una cuenta',
			invalidCredentials: 'Usuario o contraseña inválidos.'
		},
		dashboard: {
			adminBadge: 'Admin',
			gallery: 'Galería',
			friends: 'Amigos',
			expireOld: 'Expirar antiguos',
			cardsLab: 'Lab de Cartas',
			readyTitle: '¿Listo para duelar?',
			readySub: 'Inicia un Duelo de Atributos contra el bot y aumenta tu colección de victorias.',
			startDuel: 'Iniciar Duelo',
			yourGames: 'Tus partidas activas',
			noGames: 'Aún no hay partidas activas: inicia un duelo arriba.',
			mode: 'Modo',
			updated: 'Actualizado',
			resume: 'Reanudar',
			openGame: 'Abrir partida',
			finishGame: 'Finalizar la partida',
			allGames: 'Todas las partidas activas (admin)',
			noServerGames: 'No hay partidas activas en el servidor.',
			players: 'Jugadores',
			open: 'Abrir',
			stats: {
				wins: 'Victorias',
				played: 'Partidas jugadas',
				draws: 'Empates',
				active: 'Partidas activas',
				rank: 'Rango',
				lastActivity: 'Última actividad'
			}
		}
	},
	gallery: {
		home: 'Inicio',
		title: 'Colecciones',
		subtitle: 'Haz clic en una carta para ampliarla.',
		loading: 'Cargando cartas…',
		error: 'Error: {message}',
		noCollections: 'No se encontraron colecciones.',
		noCards: 'No se encontraron cartas en esta colección.',
		cardCount: '{count} cartas',
		close: 'Cerrar',
		card: 'Carta',
		stats: {
			magic: 'Magia',
			might: 'Fuerza',
			fire: 'Fuego'
		}
	},
	register: {
		title: 'Crea tu cuenta',
		subtitle: 'Es rápido y gratis.',
		username: 'Usuario',
		usernamePlaceholder: 'Apodo',
		password: 'Contraseña',
		confirmPassword: 'Confirmar contraseña',
		submit: 'Crear cuenta',
		back: 'Volver',
		errors: {
			usernameRequired: 'El usuario es obligatorio.',
			passwordRequired: 'La contraseña es obligatoria.',
			passwordMismatch: 'Las contraseñas no coinciden.',
			generic: 'No se pudo crear la cuenta.'
		}
	},
	auth: {
		googleContinue: 'Continuar con Google',
		googleComingSoon: 'El inicio de sesión con Google llegará pronto.'
	},
	attributes: {
		magic: 'Magia',
		might: 'Fuerza',
		fire: 'Fuego'
	},
	duel: {
		home: 'Inicio',
		mode: 'Duelo de Atributos',
		surrender: 'Rendirse',
		toggleLayout: 'Cambiar diseño (mano al lado)',
		surrenderConfirm: '¿Seguro que quieres rendirte?',
		loginToSurrender: 'Inicia sesión para rendirte.',
		roundsWon: 'Rondas ganadas',
		cardsLeft: 'Cartas en el mazo',
		opponentCard: 'Carta del oponente',
		returnCard: 'Devolver la carta a la mano',
		chooseAttribute: 'Elige el atributo:',
		chooseMagic: 'Elegir magia ({value})',
		chooseMight: 'Elegir fuerza ({value})',
		chooseFire: 'Elegir fuego ({value})',
		waitingForAttribute: 'Esperando a que {name} elija el atributo…',
		selectCard: 'Selecciona una carta de tu mano para enviarla a la batalla.',
		waiting: 'Esperando…',
		yourCardHere: 'Tu carta va aquí',
		you: 'Tú',
		play: 'Jugar {name}',
		playAgain: 'Jugar de nuevo',
		timerChooseAttribute: 'Elegir atributo',
		timerOpponentChoosing: 'Oponente eligiendo',
		timerSelectCards: 'Seleccionar cartas',
		roundTied: '¡Ronda empatada!',
		roundYouWin: '¡Ganaste la ronda!',
		roundOpponentWins: '{name} gana la ronda',
		victory: '¡Victoria!',
		defeat: 'Derrota',
		draw: 'Empate',
		drawSub: 'El duelo terminó en empate perfecto.',
		winnerSub: '{name} gana la partida.',
		errorLoadState: 'No se pudo cargar el estado del juego',
		errorSurrender: 'No se pudo rendir la partida.',
		playerSurrendered: 'Un jugador se rindió.',
		historyTitle: 'Registro de Batalla',
		historyEmpty: 'Aún no hay rondas: elige una carta para comenzar el duelo.',
		historyRound: 'Ronda {n}',
		historyLive: 'EN VIVO',
		historyTie: 'Empate',
		historyYouWinRound: 'Ganas la ronda',
		historyOppWinsRound: '{name} gana la ronda'
	},
	friends: {
		title: 'Aliados y Rivales',
		close: 'Cerrar',
		closeAria: 'Cerrar panel de amigos',
		searchTitle: 'Buscar jugadores',
		searchHint: 'Desafía a alguien nuevo o envía una solicitud.',
		searchPlaceholder: 'Buscar nombres de usuario',
		searchAria: 'Buscar jugadores',
		search: 'Buscar',
		searching: 'Buscando…',
		noPlayers: 'No se encontraron jugadores.',
		you: 'Tú',
		sendRequest: 'Enviar solicitud',
		requestsTitle: 'Solicitudes recibidas',
		requestsHint: 'Responde a los retadores que esperan tu respuesta.',
		noRequests: 'No hay solicitudes pendientes.',
		accept: 'Aceptar',
		dismiss: 'Rechazar',
		rosterTitle: 'Lista de amigos',
		rosterHint: 'Gestiona alianzas, duelos y rivalidades.',
		noFriends: 'Aún no tienes aliados. Envía una solicitud arriba.',
		blocked: 'Bloqueado',
		view: 'Ver',
		detailsTitle: 'Detalles del amigo',
		detailsHint: 'Invita a una batalla o gestiona tu conexión.',
		selectFriend: 'Selecciona un amigo para ver más opciones.',
		startClassic: 'Iniciar partida clásica',
		startDuel: 'Iniciar duelo',
		openChat: 'Abrir chat',
		removeFriend: 'Eliminar amigo',
		blockPlayer: 'Bloquear jugador',
		chatTitle: 'Chat de amigos',
		chatHint: 'Intercambia mensajes con tus aliados.',
		chatPickFriend: 'Elige un amigo de la lista para ver tu historial de chat.',
		chatLoading: 'Cargando chat…',
		noMessages: 'Aún no hay mensajes.',
		messagePlaceholder: 'Escribe un mensaje',
		send: 'Enviar',
		statusAccepted: 'Aceptado',
		statusPending: 'Pendiente',
		statusDeclined: 'Rechazado',
		statusBlocked: 'Bloqueado',
		sessionExpired: 'Tu sesión de Cartomania expiró. Inicia sesión de nuevo para gestionar amigos.',
		missingTables:
			'Al backend de Cartomania le faltan las tablas de amistad. Ejecuta las últimas migraciones de Prisma en Cartomania (p. ej. pnpm prisma migrate deploy) y puebla la base de datos antes de probar las funciones de amigos.',
		loadFail: 'No se pudieron cargar los datos de amigos.',
		searchFail: 'No se pudo buscar jugadores.',
		requestSent: 'Solicitud de amistad enviada.',
		requestSendFail: 'No se pudo enviar la solicitud de amistad.',
		requestAccepted: 'Solicitud de amistad aceptada.',
		requestDismissed: 'Solicitud de amistad rechazada.',
		requestResolveFail: 'No se pudo responder a la solicitud de amistad.',
		friendRemoved: 'Amigo eliminado.',
		friendRemoveFail: 'No se pudo eliminar el amigo.',
		playerBlocked: 'Jugador bloqueado.',
		playerBlockFail: 'No se pudo bloquear al jugador.',
		chatLoadFail: 'No se pudo cargar el historial del chat.',
		messageSendFail: 'No se pudo enviar el mensaje.',
		matchCreated: 'Partida creada.',
		matchStartFail: 'No se pudo iniciar la partida con el amigo.'
	},
	legal: {
		back: 'Volver a Cartomania',
		kicker: 'Legal',
		updated: 'Última actualización: {date}',
		contactLink: 'repositorio de GitHub',
		disclaimer:
			'Cartomania es un proyecto personal de portafolio, no un servicio comercial. Esta página se ofrece por transparencia y no constituye asesoramiento legal.',
		privacy: {
			title: 'Política de Privacidad',
			intro:
				'Cartomania es un proyecto de portafolio gratuito y no comercial: un juego de cartas coleccionables digital creado para mostrar la colección Dracomania. Esta página explica, en lenguaje sencillo, qué información maneja el juego y por qué. Recopilamos lo mínimo posible y nunca vendemos tus datos.',
			contactHeading: 'Contacto',
			contactText: '¿Dudas sobre privacidad? Contáctanos a través del',
			sections: [
				{
					heading: 'Información que recopilamos',
					paragraphs: [],
					items: [
						{
							strong: 'Datos de la cuenta',
							text: 'el nombre de usuario que eliges y tu contraseña. Las contraseñas se almacenan solo como un hash con sal; nunca guardamos ni mostramos el texto sin cifrar.'
						},
						{
							strong: 'Datos de juego',
							text: 'las partidas que juegas, sus resultados y estadísticas agregadas como partidas jugadas, ganadas y empatadas.'
						},
						{
							strong: 'Datos sociales',
							text: 'solicitudes de amistad, tu lista de amigos y los mensajes que envías por el panel de amigos del juego.'
						},
						{
							strong: 'Datos técnicos',
							text: 'una cookie de sesión que te mantiene conectado y una cookie que recuerda tu idioma. No usamos cookies de publicidad ni de seguimiento entre sitios.'
						}
					]
				},
				{
					heading: 'Cómo usamos tu información',
					paragraphs: [],
					items: [
						{ strong: '', text: 'Para crear tu cuenta y mantenerte conectado.' },
						{
							strong: '',
							text: 'Para ejecutar partidas, emparejarte con amigos y registrar resultados y estadísticas.'
						},
						{ strong: '', text: 'Para mantener el servicio funcionando, seguro y libre de abusos.' }
					]
				},
				{
					heading: 'Cookies',
					paragraphs: [
						'Cartomania usa solo cookies esenciales y propias: una para recordar que has iniciado sesión y otra para recordar tu idioma. El juego no establece cookies de analítica ni de publicidad de terceros.'
					],
					items: []
				},
				{
					heading: 'Compartir y terceros',
					paragraphs: [
						'No vendemos, alquilamos ni intercambiamos tu información personal. Las ilustraciones de las cartas se sirven desde bobagi.space, por lo que cargarlas implica una solicitud web estándar a ese host. El juego se ejecuta en la propia infraestructura del autor.'
					],
					items: []
				},
				{
					heading: 'Conservación de datos',
					paragraphs: [
						'Las partidas inactivas caducan y se limpian automáticamente. Los datos de la cuenta y de juego se conservan mientras exista tu cuenta. Puedes solicitar la eliminación de tu cuenta y los datos asociados en cualquier momento.'
					],
					items: []
				},
				{
					heading: 'Tus derechos',
					paragraphs: [
						'Puedes solicitar acceder, corregir o eliminar la información asociada a tu cuenta. Al tratarse de un pequeño proyecto personal, las solicitudes se atienden manualmente y según las posibilidades.'
					],
					items: []
				},
				{
					heading: 'Niños',
					paragraphs: [
						'Cartomania no está dirigido a menores de 13 años y no recopilamos información de ellos de forma consciente.'
					],
					items: []
				},
				{
					heading: 'Cambios en esta política',
					paragraphs: [
						'Podemos actualizar esta política a medida que el proyecto evoluciona. Los cambios importantes se reflejan en la fecha de “última actualización” de arriba.'
					],
					items: []
				}
			]
		},
		terms: {
			title: 'Términos de Servicio',
			intro:
				'Bienvenido a Cartomania, un juego de cartas coleccionables digital gratuito y proyecto personal de portafolio. Al crear una cuenta o jugar, aceptas estos términos. Si no estás de acuerdo, por favor no uses el servicio.',
			contactHeading: 'Contacto',
			contactText: '¿Dudas sobre estos términos? Contáctanos a través del',
			sections: [
				{
					heading: 'El servicio',
					paragraphs: [
						'Cartomania se ofrece de forma gratuita, “tal cual”, con fines de entretenimiento y demostración. Es un proyecto de hobby en evolución: las funciones pueden cambiar y el juego puede dejar de estar disponible o descontinuarse en cualquier momento sin previo aviso.'
					],
					items: []
				},
				{
					heading: 'Tu cuenta',
					paragraphs: [],
					items: [
						{ strong: '', text: 'Eres responsable de mantener seguras tu contraseña y tu cuenta.' },
						{ strong: '', text: 'Proporciona información veraz y no suplantes a otras personas.' },
						{ strong: '', text: 'Eres responsable de la actividad que ocurra en tu cuenta.' }
					]
				},
				{
					heading: 'Uso aceptable',
					paragraphs: ['Aceptas no:'],
					items: [
						{
							strong: '',
							text: 'Hacer trampa, explotar errores ni usar bots o scripts automatizados para jugar o extraer datos del juego.'
						},
						{
							strong: '',
							text: 'Acosar, amenazar ni abusar de otros jugadores mediante el chat o cualquier otra función.'
						},
						{
							strong: '',
							text: 'Intentar interrumpir, sobrecargar u obtener acceso no autorizado al servicio o a otras cuentas.'
						},
						{ strong: '', text: 'Usar el servicio para cualquier fin ilícito.' }
					]
				},
				{
					heading: 'Propiedad intelectual',
					paragraphs: [
						'El nombre Cartomania, la colección Dracomania y las ilustraciones de sus cartas pertenecen a su autor. Las fuentes y otros recursos de terceros siguen siendo propiedad de sus respectivos dueños. El código fuente del proyecto se rige por la licencia de su repositorio de GitHub. Recibes un derecho personal, no exclusivo e intransferible para jugar; nada de esto te transfiere la propiedad de ningún contenido.'
					],
					items: []
				},
				{
					heading: 'Renuncia de garantías',
					paragraphs: [
						'El servicio se ofrece sin garantías de ningún tipo, expresas o implícitas, incluida la idoneidad para un fin concreto y el funcionamiento ininterrumpido o sin errores. Lo usas bajo tu propio riesgo.'
					],
					items: []
				},
				{
					heading: 'Limitación de responsabilidad',
					paragraphs: [
						'En la máxima medida permitida por la ley, el proyecto y su autor no son responsables de daños indirectos, incidentales o consecuentes, ni de la pérdida de datos derivada del uso del servicio.'
					],
					items: []
				},
				{
					heading: 'Terminación',
					paragraphs: [
						'Puedes dejar de usar Cartomania y solicitar la eliminación de tu cuenta en cualquier momento. Podemos suspender o eliminar cuentas que infrinjan estos términos o para proteger el servicio y a sus jugadores.'
					],
					items: []
				},
				{
					heading: 'Cambios en estos términos',
					paragraphs: [
						'Podemos actualizar estos términos a medida que el proyecto cambia. El uso continuado tras una actualización significa que aceptas los términos revisados; la fecha de “última actualización” de arriba refleja la versión más reciente.'
					],
					items: []
				}
			]
		}
	},
	account: {
		navLabel: 'Cuenta',
		title: 'Configuración de la cuenta',
		back: 'Volver',
		chooseAvatar: 'Elige tu avatar',
		save: 'Guardar',
		cancel: 'Cancelar',
		usernameTitle: 'Usuario',
		usernameHint: 'Tu nombre visible y de inicio de sesión (3–50 caracteres).',
		newUsername: 'Nuevo nombre de usuario',
		changeUsername: 'Cambiar nombre de usuario',
		passwordTitle: 'Contraseña',
		currentPassword: 'Contraseña actual',
		newPassword: 'Nueva contraseña',
		confirmNewPassword: 'Confirmar nueva contraseña',
		changePassword: 'Cambiar contraseña',
		dangerTitle: 'Zona de peligro',
		deleteWarning:
			'Esto elimina permanentemente tu cuenta y todos los datos relacionados (partidas, amigos, mensajes). No se puede deshacer.',
		deleteAccount: 'Eliminar cuenta',
		deleteConfirm: 'Sí, eliminar mi cuenta',
		usernameUpdated: 'Nombre de usuario actualizado.',
		passwordUpdated: 'Contraseña cambiada.',
		avatarUpdated: 'Avatar actualizado.',
		passwordsDoNotMatch: 'Las nuevas contraseñas no coinciden.',
		genericError: 'Algo salió mal. Inténtalo de nuevo.'
	}
};

export default es;
