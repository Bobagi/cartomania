// Español
import type en from './en';

const es: typeof en = {
	language: {
		change: 'Cambiar idioma'
	},
	common: {
		back: 'Volver'
	},
	consent: {
		ariaLabel: 'Consentimiento de cookies',
		title: 'Cookies y analítica',
		message:
			'Usamos cookies esenciales para que el juego funcione y mantener tu sesión. Solo con tu consentimiento, también cargamos analítica respetuosa con la privacidad y sin cookies para entender cómo se usa Cartomania. Sin anuncios, sin rastreo entre sitios y nunca vendemos tus datos.',
		acceptAll: 'Aceptar todo',
		essentialOnly: 'Solo esenciales',
		privacyLink: 'Política de Privacidad',
		manage: 'Preferencias de cookies'
	},
	nav: {
		login: 'Iniciar sesión',
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
		serverLabel: 'Servidor',
		promise:
			'Dragones, guerreros y criaturas míticas se enfrentan en la mesa. Eliges el atributo que crees que gana la ronda: magia, fuerza o fuego. Si aciertas, las dos cartas son tuyas.',
		playCta: 'Juega tu primer duelo',
		playNote: 'Gratis, directo en el navegador.',
		galleryCta: 'Ver las cartas',
		attributes: {
			title: 'Tres formas de ganar la ronda',
			subtitle: 'Cada carta lleva los tres. Solo cuenta el atributo que tú elijas.',
			magic: {
				name: 'Magia',
				text: 'Poder arcano. La carta que perdería a golpes suele ganar con el hechizo.'
			},
			might: {
				name: 'Fuerza',
				text: 'Fuerza bruta. La elección segura, y lo que mantiene peligrosos a los pesados.'
			},
			fire: {
				name: 'Fuego',
				text: 'Llama ardiente. La mayor variación del tablero, y por eso la apuesta más audaz.'
			}
		},
		how: {
			title: 'Cómo funciona una ronda',
			subtitle: 'Una ronda, tres tiempos. Una partida termina en un par de minutos.',
			revealTitle: 'Revelar',
			revealText: 'Ambos duelistas juegan una carta de su mano. La arena las voltea a la vez.',
			clashTitle: 'Enfrentar',
			clashText: 'Uno de los duelistas elige el atributo. Ambas cartas valen solo ese número.',
			captureTitle: 'Capturar',
			captureText:
				'El valor más alto se lleva las dos cartas. Cuando una mano se acaba, la pila mayor gana la partida.'
		},
		collection: {
			title: 'La colección Dracomania',
			subtitle:
				'{count} dragones, guerreros y criaturas míticas pintados a mano, cada uno con su magia, fuerza y fuego. Aprende los números y sabrás qué atributo elegir.',
			cta: 'Ver todas las cartas'
		},
		finalCta: {
			title: 'La arena está abierta',
			text: 'Crea una cuenta y en segundos estarás duelando, contra el bot de la casa o contra un amigo al que retes.',
			button: 'Juega tu primer duelo'
		},
		auth: {
			title: 'Entra en la arena',
			subtitle: 'Inicia sesión para retomar tus duelos.',
			username: 'Usuario',
			usernamePlaceholder: 'Tu apodo',
			password: 'Contraseña',
			login: 'Iniciar sesión',
			or: 'o',
			browseGallery: 'Explorar la galería',
			createAccount: 'Crear una cuenta',
			newHere: '¿Eres nuevo?',
			haveAccount: '¿Ya tienes cuenta?',
			returning: '¿Ya juegas?',
			invalidCredentials: 'Usuario o contraseña inválidos.',
			forgotPassword: '¿Olvidaste tu contraseña?'
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
		email: 'Correo',
		emailPlaceholder: 'tu@ejemplo.com',
		password: 'Contraseña',
		confirmPassword: 'Confirmar contraseña',
		submit: 'Crear cuenta',
		back: 'Volver',
		terms: {
			prefix: 'He leído y acepto los',
			terms: 'Términos de Uso',
			and: 'y la',
			privacy: 'Política de Privacidad'
		},
		errors: {
			usernameRequired: 'El usuario es obligatorio.',
			passwordRequired: 'La contraseña es obligatoria.',
			passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
			emailInvalid: 'Introduce un correo válido.',
			passwordMismatch: 'Las contraseñas no coinciden.',
			termsRequired: 'Debes aceptar los Términos de Uso y la Política de Privacidad.',
			generic: 'No se pudo crear la cuenta.'
		}
	},
	auth: {
		googleContinue: 'Continuar con Google',
		googleComingSoon: 'El inicio de sesión con Google llegará pronto.',
		googleError: 'El inicio de sesión con Google no se completó. Inténtalo de nuevo.'
	},
	agreement: {
		title: 'Antes de jugar',
		version: 'Versión {version}',
		intro:
			'Para seguir jugando a Cartomania, lee y acepta nuestros Términos de Uso y la Política de Privacidad. Puedes leer los Términos abajo y abrir cualquiera de los documentos en una pestaña nueva.',
		viewTerms: 'Abrir Términos de Uso',
		viewPrivacy: 'Abrir Política de Privacidad',
		termsLabel: 'Términos de Uso',
		privacyLabel: 'Política de Privacidad',
		checkboxAge: 'Tengo al menos 18 años, o cuento con el consentimiento de mi tutor.',
		checkboxTermsPre: 'He leído y acepto los',
		checkboxPrivacyPre: 'He leído y acepto la',
		accept: 'Acepto',
		accepting: 'Guardando…',
		decline: 'Rechazar y salir',
		error: 'No se pudo guardar tu aceptación. Inténtalo de nuevo.'
	},
	forgot: {
		title: '¿Olvidaste tu contraseña?',
		subtitle: 'Escribe tu correo y te enviaremos un enlace para restablecerla.',
		email: 'Correo',
		emailPlaceholder: 'tu@ejemplo.com',
		submit: 'Enviar enlace',
		sent: 'Si existe una cuenta con ese correo, el enlace de restablecimiento va en camino. Revisa tu bandeja de entrada.',
		backToLogin: 'Volver al inicio de sesión'
	},
	reset: {
		title: 'Elige una nueva contraseña',
		subtitle: 'Escribe una nueva contraseña para tu cuenta.',
		newPassword: 'Nueva contraseña',
		confirm: 'Confirmar contraseña',
		submit: 'Restablecer contraseña',
		done: 'Tu contraseña se restableció. Ya puedes iniciar sesión.',
		goLogin: 'Ir al inicio de sesión',
		requestNew: 'Solicitar un nuevo enlace',
		errors: {
			passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
			mismatch: 'Las contraseñas no coinciden.',
			invalid: 'Este enlace de restablecimiento no es válido o expiró.',
			noToken: 'No se encontró el token. Solicita un nuevo enlace.'
		}
	},
	verify: {
		title: 'Verificación de correo',
		working: 'Verificando tu correo…',
		ok: 'Tu correo fue verificado. ¡Gracias!',
		error: 'Este enlace de verificación no es válido o expiró.',
		goHome: 'Ir al inicio',
		goAccount: 'Ir a la cuenta'
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
							text: 'una cookie de sesión que te mantiene conectado, una cookie que recuerda tu idioma y una cookie que guarda tu elección de consentimiento. Solo si aceptas la analítica, también recopilamos estadísticas de uso anónimas y agregadas (consulta “Analítica” más abajo). No usamos cookies de publicidad ni de seguimiento entre sitios.'
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
						'Cartomania usa solo cookies propias: una para recordar que has iniciado sesión, una para recordar tu idioma y una para guardar tu elección de consentimiento. Son esenciales y siempre se establecen. No establecemos ninguna cookie de publicidad ni de seguimiento entre sitios.'
					],
					items: []
				},
				{
					heading: 'Analítica',
					paragraphs: [
						'Con tu consentimiento, Cartomania carga un script de analítica propio y respetuoso con la privacidad (Umami, servido desde analytics.bobagi.space) para medir el uso agregado, como vistas de página y visitas. No usa cookies, no recopila información personal y nunca te rastrea por otros sitios web. El script solo se carga después de que aceptas la analítica en el banner de consentimiento; si eliges “Solo esenciales”, nunca se carga. Puedes cambiar tu decisión en cualquier momento mediante el enlace “Preferencias de cookies” del pie de página.'
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
		googlePhoto: 'Tu foto de Google',
		save: 'Guardar',
		cancel: 'Cancelar',
		usernameTitle: 'Usuario',
		usernameHint: 'Tu nombre visible y de inicio de sesión (3-50 caracteres).',
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
		emailTitle: 'Correo',
		emailNone: 'No hay correo configurado. Agrega uno para poder recuperar tu contraseña.',
		emailVerified: 'Tu correo está verificado.',
		emailUnverified: 'Tu correo aún no está verificado.',
		emailLabel: 'Dirección de correo',
		saveEmail: 'Guardar correo',
		emailUpdated: 'Correo guardado. Revisa tu bandeja para verificarlo.',
		resendVerification: 'Reenviar correo de verificación',
		verificationResent: 'Correo de verificación enviado (si tu dirección lo necesita).',
		googleTitle: 'Google',
		googleConnected: 'Tu cuenta de Google está conectada.',
		googleDisconnect: 'Desconectar Google',
		googleSetPasswordFirst: 'Configura una contraseña antes de desconectar Google.',
		googleNotConnected: 'Conecta Google para entrar con un clic.',
		googleConnect: 'Conectar Google',
		genericError: 'Algo salió mal. Inténtalo de nuevo.'
	}
};

export default es;
