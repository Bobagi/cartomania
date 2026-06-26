/**
 * Cookie / analytics consent for Cartomania.
 *
 * The only non-essential script the site loads is privacy-friendly, self-hosted
 * Umami analytics. We never load it until the visitor has explicitly accepted
 * analytics in the consent banner — that is the whole point of this module:
 *   - essential cookies (session, language, this consent choice) always work;
 *   - the analytics script is injected lazily, client-side, ONLY after consent.
 *
 * Kept framework-agnostic (no Svelte imports beyond the store) so it can be read
 * during SSR (parse the cookie) and on the client (inject the script) alike.
 */

import { writable } from 'svelte/store';

/** Cookie that persists the visitor's consent choice across requests. */
export const CONSENT_COOKIE = 'cartomania_consent';

/** A year, in seconds — same lifetime as the language cookie. */
const CONSENT_MAX_AGE = 31_536_000;

/** Self-hosted, cookieless analytics. Loaded only after the user accepts. */
const UMAMI_SRC = 'https://analytics.bobagi.space/script.js';
const UMAMI_WEBSITE_ID = 'eb0266c7-e0cd-4ba4-9ce8-ad4f0c3b6af5';

export type ConsentState = {
	/** The visitor has made a choice (so the banner stays hidden). */
	decided: boolean;
	/** Non-essential analytics are allowed. */
	analytics: boolean;
};

const UNDECIDED: ConsentState = { decided: false, analytics: false };

/** Parse the raw cookie value into a consent state. */
export function parseConsent(cookieValue?: string | null): ConsentState {
	if (cookieValue === 'all') return { decided: true, analytics: true };
	if (cookieValue === 'essential') return { decided: true, analytics: false };
	return UNDECIDED;
}

/** Reactive consent state. Seeded from the server-resolved cookie, then owned by the client. */
export const consent = writable<ConsentState>(UNDECIDED);

// Once the visitor clicks a button in-session we must not let a later
// `initConsent(data.consentCookie)` (re-run on navigation) clobber the choice
// before the freshly-set cookie has propagated into the layout data.
let clientChoiceMade = false;

/** Seed the store from the cookie the server resolved (SSR + first hydration). */
export function initConsent(cookieValue?: string | null): void {
	if (clientChoiceMade) return;
	consent.set(parseConsent(cookieValue));
}

function persist(value: 'all' | 'essential'): void {
	if (typeof document === 'undefined') return;
	document.cookie = `${CONSENT_COOKIE}=${value}; path=/; max-age=${CONSENT_MAX_AGE}; SameSite=Lax`;
}

/** Accept everything, including analytics. */
export function acceptAll(): void {
	clientChoiceMade = true;
	persist('all');
	consent.set({ decided: true, analytics: true });
}

/** Reject non-essential: keep only the cookies the game needs to run. */
export function acceptEssential(): void {
	clientChoiceMade = true;
	persist('essential');
	consent.set({ decided: true, analytics: false });
}

/** Re-open the banner so the visitor can change their mind (footer link). */
export function reopenConsent(): void {
	clientChoiceMade = false;
	consent.update((c) => ({ ...c, decided: false }));
}

let analyticsLoaded = false;

/**
 * Inject the analytics script exactly once. Safe to call repeatedly (guarded),
 * so the layout can call it from a reactive block whenever consent flips on.
 */
export function loadAnalytics(): void {
	if (analyticsLoaded || typeof document === 'undefined') return;
	if (document.querySelector(`script[data-website-id="${UMAMI_WEBSITE_ID}"]`)) {
		analyticsLoaded = true;
		return;
	}
	const script = document.createElement('script');
	script.defer = true;
	script.src = UMAMI_SRC;
	script.setAttribute('data-website-id', UMAMI_WEBSITE_ID);
	document.head.appendChild(script);
	analyticsLoaded = true;
}
