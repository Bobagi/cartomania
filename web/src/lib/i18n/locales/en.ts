// English — the canonical dictionary; its shape is the source of truth for the
// other locales (see src/lib/i18n/index.ts).
const en = {
	language: {
		change: 'Change language'
	},
	common: {
		back: 'Back'
	},
	consent: {
		ariaLabel: 'Cookie consent',
		title: 'Cookies & analytics',
		message:
			'We use essential cookies to run the game and keep you signed in. Only with your consent, we also load privacy-friendly, cookieless analytics to see how Cartomania is used. No ads, no cross-site tracking, and we never sell your data.',
		acceptAll: 'Accept all',
		essentialOnly: 'Essential only',
		privacyLink: 'Privacy Policy',
		manage: 'Cookie preferences'
	},
	nav: {
		logout: 'Log out'
	},
	footer: {
		tagline: 'Strategic mythology card battles in your browser.',
		community: 'Community',
		privacy: 'Privacy',
		terms: 'Terms',
		rights: '© {year} Cartomania',
		fanMade:
			'Cartomania is a fan-made, non-commercial game built around the Dracomania card collection. It is not affiliated with, sponsored by, or endorsed by the original creators of Dracomania.'
	},
	home: {
		kicker: 'Digital Collectible Card Duel',
		tagline:
			'Command the Dracomania collection and duel by fire, magic and might. Each round both duelists reveal a card and clash on one attribute — capture more cards than your rival to claim the match.',
		serverLabel: 'Server',
		auth: {
			title: 'Enter the arena',
			subtitle: 'Log in to play, or browse the collection first.',
			username: 'Username',
			usernamePlaceholder: 'Your nickname',
			password: 'Password',
			login: 'Log in',
			or: 'or',
			browseGallery: 'Browse the gallery',
			createAccount: 'Create an account',
			invalidCredentials: 'Invalid username or password.'
		},
		dashboard: {
			adminBadge: 'Admin',
			gallery: 'Gallery',
			friends: 'Friends',
			expireOld: 'Expire old',
			cardsLab: 'Cards Lab',
			readyTitle: 'Ready to duel?',
			readySub: 'Start an Attribute Duel against the bot and grow your collection of victories.',
			startDuel: 'Start Duel',
			yourGames: 'Your active games',
			noGames: 'No active games yet — start a duel above.',
			mode: 'Mode',
			updated: 'Updated',
			resume: 'Resume',
			openGame: 'Open game',
			finishGame: 'Finish the game',
			allGames: 'All active games (admin)',
			noServerGames: 'No active games on the server.',
			players: 'Players',
			open: 'Open',
			stats: {
				wins: 'Wins',
				played: 'Games played',
				draws: 'Draws',
				active: 'Active games',
				rank: 'Rank',
				lastActivity: 'Last activity'
			}
		}
	},
	gallery: {
		home: 'Home',
		title: 'Collections',
		subtitle: 'Click a card to enlarge it.',
		loading: 'Loading cards…',
		error: 'Error: {message}',
		noCollections: 'No collections found.',
		noCards: 'No cards found in this collection.',
		cardCount: '{count} cards',
		close: 'Close',
		card: 'Card',
		stats: {
			magic: 'Magic',
			might: 'Might',
			fire: 'Fire'
		}
	},
	register: {
		title: 'Create your account',
		subtitle: 'It’s quick and free.',
		username: 'Username',
		usernamePlaceholder: 'Nickname',
		password: 'Password',
		confirmPassword: 'Confirm password',
		submit: 'Create account',
		back: 'Back',
		errors: {
			usernameRequired: 'Username is required.',
			passwordRequired: 'Password is required.',
			passwordMismatch: 'Passwords do not match.',
			generic: 'Could not create account.'
		}
	},
	auth: {
		googleContinue: 'Continue with Google',
		googleComingSoon: 'Google sign-in is coming soon.'
	},
	attributes: {
		magic: 'Magic',
		might: 'Might',
		fire: 'Fire'
	},
	duel: {
		home: 'Home',
		mode: 'Attribute Duel',
		surrender: 'Surrender',
		toggleLayout: 'Toggle layout (hand to the side)',
		surrenderConfirm: 'Are you sure you want to surrender?',
		loginToSurrender: 'Login required to surrender.',
		roundsWon: 'Rounds won',
		cardsLeft: 'Cards left in deck',
		opponentCard: 'Opponent card',
		returnCard: 'Return card to hand',
		chooseAttribute: 'Choose attribute:',
		chooseMagic: 'Choose magic ({value})',
		chooseMight: 'Choose might ({value})',
		chooseFire: 'Choose fire ({value})',
		waitingForAttribute: 'Waiting for {name} to choose the attribute…',
		selectCard: 'Select a card from your hand to send into battle.',
		waiting: 'Waiting…',
		yourCardHere: 'Your card goes here',
		you: 'You',
		play: 'Play {name}',
		playAgain: 'Play again',
		timerChooseAttribute: 'Choose attribute',
		timerOpponentChoosing: 'Opponent choosing',
		timerSelectCards: 'Select cards',
		roundTied: 'Round tied!',
		roundYouWin: 'You win the round!',
		roundOpponentWins: '{name} wins the round',
		victory: 'Victory!',
		defeat: 'Defeat',
		draw: 'Draw',
		drawSub: 'The duel ended in a perfect tie.',
		winnerSub: '{name} wins the match.',
		errorLoadState: 'Could not load game state',
		errorSurrender: 'Unable to surrender match.',
		playerSurrendered: 'A player surrendered.',
		historyTitle: 'Battle Log',
		historyEmpty: 'No rounds yet — pick a card to begin the duel.',
		historyRound: 'Round {n}',
		historyLive: 'LIVE',
		historyTie: 'Tie',
		historyYouWinRound: 'You win the round',
		historyOppWinsRound: '{name} wins the round'
	},
	friends: {
		title: 'Allies & Rivals',
		close: 'Close',
		closeAria: 'Close friends panel',
		searchTitle: 'Search players',
		searchHint: 'Challenge someone new or send a request.',
		searchPlaceholder: 'Search usernames',
		searchAria: 'Search players',
		search: 'Search',
		searching: 'Searching…',
		noPlayers: 'No players found.',
		you: 'You',
		sendRequest: 'Send request',
		requestsTitle: 'Incoming requests',
		requestsHint: 'Respond to challengers awaiting your answer.',
		noRequests: 'No pending requests.',
		accept: 'Accept',
		dismiss: 'Dismiss',
		rosterTitle: 'Friends roster',
		rosterHint: 'Manage alliances, duels, and rivalries.',
		noFriends: 'You have no allies yet. Send a request above.',
		blocked: 'Blocked',
		view: 'View',
		detailsTitle: 'Friend details',
		detailsHint: 'Invite to a battle or manage your connection.',
		selectFriend: 'Select a friend to see more options.',
		startClassic: 'Start classic match',
		startDuel: 'Start duel',
		openChat: 'Open chat',
		removeFriend: 'Remove friend',
		blockPlayer: 'Block player',
		chatTitle: 'Friend chat',
		chatHint: 'Exchange messages with your allies.',
		chatPickFriend: 'Pick a friend from the roster to view your chat history.',
		chatLoading: 'Loading chat…',
		noMessages: 'No messages yet.',
		messagePlaceholder: 'Type a message',
		send: 'Send',
		statusAccepted: 'Accepted',
		statusPending: 'Pending',
		statusDeclined: 'Declined',
		statusBlocked: 'Blocked',
		sessionExpired: 'Your Cartomania session expired. Please sign in again to manage friends.',
		missingTables:
			'Cartomania backend is missing the friendship tables. Execute the latest Prisma migrations in Cartomania (e.g. pnpm prisma migrate deploy) and seed the database before testing the friends features.',
		loadFail: 'Unable to load friend data.',
		searchFail: 'Failed to search players.',
		requestSent: 'Friend request sent.',
		requestSendFail: 'Unable to send friend request.',
		requestAccepted: 'Friend request accepted.',
		requestDismissed: 'Friend request dismissed.',
		requestResolveFail: 'Unable to resolve friend request.',
		friendRemoved: 'Friend removed.',
		friendRemoveFail: 'Unable to remove friend.',
		playerBlocked: 'Player blocked.',
		playerBlockFail: 'Unable to block player.',
		chatLoadFail: 'Unable to load chat history.',
		messageSendFail: 'Unable to send message.',
		matchCreated: 'Match created.',
		matchStartFail: 'Unable to start match with friend.'
	},
	legal: {
		back: 'Back to Cartomania',
		kicker: 'Legal',
		updated: 'Last updated: {date}',
		contactLink: 'GitHub repository',
		disclaimer:
			'Cartomania is a personal portfolio project, not a commercial service. This page is provided for transparency and does not constitute legal advice.',
		privacy: {
			title: 'Privacy Policy',
			intro:
				'Cartomania is a free, non-commercial portfolio project — a digital collectible card game built to showcase the Dracomania collection. This page explains, in plain language, what information the game handles and why. We collect as little as possible and never sell your data.',
			contactHeading: 'Contact',
			contactText: 'Questions about privacy? Reach out through the project’s',
			sections: [
				{
					heading: 'Information we collect',
					paragraphs: [],
					items: [
						{
							strong: 'Account details',
							text: 'the username you choose and your password. Passwords are stored only as a salted hash; we never keep or display the plain text.'
						},
						{
							strong: 'Gameplay data',
							text: 'the matches you play, their results, and aggregate statistics such as games played, won and drawn.'
						},
						{
							strong: 'Social data',
							text: 'friend requests, your friends list and any chat messages you send through the in-game friends panel.'
						},
						{
							strong: 'Technical data',
							text: 'a session cookie that keeps you signed in, a cookie that remembers your language, and a cookie that stores your consent choice. Only if you accept analytics, we additionally collect anonymous, aggregate usage statistics (see “Analytics” below). We do not use advertising or cross-site tracking cookies.'
						}
					]
				},
				{
					heading: 'How we use your information',
					paragraphs: [],
					items: [
						{ strong: '', text: 'To create your account and keep you signed in.' },
						{
							strong: '',
							text: 'To run matches, match you with friends and record results and statistics.'
						},
						{ strong: '', text: 'To keep the service working, secure and free of abuse.' }
					]
				},
				{
					heading: 'Cookies',
					paragraphs: [
						'Cartomania uses first-party cookies only: one to remember that you are logged in, one to remember your chosen language, and one to remember your cookie-consent choice. These are essential and always set. We do not set any advertising or cross-site tracking cookies.'
					],
					items: []
				},
				{
					heading: 'Analytics',
					paragraphs: [
						'With your consent, Cartomania loads a self-hosted, privacy-friendly analytics script (Umami, served from analytics.bobagi.space) to measure aggregate usage such as page views and visits. It is cookieless, does not collect personal information, and never tracks you across other websites. The script loads only after you accept analytics in the consent banner — if you choose “Essential only”, it is never loaded. You can change your decision at any time through the “Cookie preferences” link in the footer.'
					],
					items: []
				},
				{
					heading: 'Sharing & third parties',
					paragraphs: [
						'We do not sell, rent or trade your personal information. Card artwork is served from bobagi.space, so loading those images involves a standard web request to that host. The game runs on the owner’s own infrastructure.'
					],
					items: []
				},
				{
					heading: 'Data retention',
					paragraphs: [
						'Inactive games are expired and cleaned up automatically. Account and gameplay data are kept while your account exists. You may request deletion of your account and associated data at any time.'
					],
					items: []
				},
				{
					heading: 'Your rights',
					paragraphs: [
						'You can ask to access, correct or delete the information associated with your account. As this is a small hobby project, requests are handled manually on a best-effort basis.'
					],
					items: []
				},
				{
					heading: 'Children',
					paragraphs: [
						'Cartomania is not directed at children under 13, and we do not knowingly collect information from them.'
					],
					items: []
				},
				{
					heading: 'Changes to this policy',
					paragraphs: [
						'We may update this policy as the project evolves. Material changes are reflected by the “last updated” date above.'
					],
					items: []
				}
			]
		},
		terms: {
			title: 'Terms of Service',
			intro:
				'Welcome to Cartomania, a free digital collectible card game and personal portfolio project. By creating an account or playing, you agree to these terms. If you do not agree, please don’t use the service.',
			contactHeading: 'Contact',
			contactText: 'Questions about these terms? Reach out through the project’s',
			sections: [
				{
					heading: 'The service',
					paragraphs: [
						'Cartomania is provided free of charge, “as is”, for entertainment and demonstration purposes. It is an evolving hobby project: features may change, and the game may be unavailable or discontinued at any time without notice.'
					],
					items: []
				},
				{
					heading: 'Your account',
					paragraphs: [],
					items: [
						{
							strong: '',
							text: 'You are responsible for keeping your password and account secure.'
						},
						{ strong: '', text: 'Provide accurate information and do not impersonate others.' },
						{
							strong: '',
							text: 'You are responsible for activity that happens under your account.'
						}
					]
				},
				{
					heading: 'Acceptable use',
					paragraphs: ['You agree not to:'],
					items: [
						{
							strong: '',
							text: 'Cheat, exploit bugs, or use bots or automated scripts to play or scrape the game.'
						},
						{
							strong: '',
							text: 'Harass, threaten or abuse other players through chat or any other feature.'
						},
						{
							strong: '',
							text: 'Attempt to disrupt, overload, or gain unauthorized access to the service or other accounts.'
						},
						{ strong: '', text: 'Use the service for anything unlawful.' }
					]
				},
				{
					heading: 'Intellectual property',
					paragraphs: [
						'The Cartomania name, the Dracomania collection and its card artwork belong to their owner. Fonts and other third-party assets remain the property of their respective owners. The project’s source code is governed by the license in its GitHub repository. You receive a personal, non-exclusive, non-transferable right to play the game; nothing here transfers ownership of any content to you.'
					],
					items: []
				},
				{
					heading: 'Disclaimer of warranties',
					paragraphs: [
						'The service is provided without warranties of any kind, express or implied, including fitness for a particular purpose and uninterrupted or error-free operation. You use it at your own risk.'
					],
					items: []
				},
				{
					heading: 'Limitation of liability',
					paragraphs: [
						'To the maximum extent permitted by law, the project and its owner are not liable for any indirect, incidental or consequential damages, or for any loss of data, arising from your use of the service.'
					],
					items: []
				},
				{
					heading: 'Termination',
					paragraphs: [
						'You may stop using Cartomania and request account deletion at any time. We may suspend or remove accounts that violate these terms or to protect the service and its players.'
					],
					items: []
				},
				{
					heading: 'Changes to these terms',
					paragraphs: [
						'We may update these terms as the project changes. Continued use after an update means you accept the revised terms; the “last updated” date above reflects the latest version.'
					],
					items: []
				}
			]
		}
	},
	account: {
		navLabel: 'Account',
		title: 'Account settings',
		back: 'Back',
		chooseAvatar: 'Choose your avatar',
		save: 'Save',
		cancel: 'Cancel',
		usernameTitle: 'Username',
		usernameHint: 'Your display and login name (3–50 characters).',
		newUsername: 'New username',
		changeUsername: 'Change username',
		passwordTitle: 'Password',
		currentPassword: 'Current password',
		newPassword: 'New password',
		confirmNewPassword: 'Confirm new password',
		changePassword: 'Change password',
		dangerTitle: 'Danger zone',
		deleteWarning:
			'This permanently deletes your account and all related data (games, friends, messages). It cannot be undone.',
		deleteAccount: 'Delete account',
		deleteConfirm: 'Yes, delete my account',
		usernameUpdated: 'Username updated.',
		passwordUpdated: 'Password changed.',
		avatarUpdated: 'Avatar updated.',
		passwordsDoNotMatch: 'The new passwords do not match.',
		genericError: 'Something went wrong. Please try again.'
	}
};

export default en;
