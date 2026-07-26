/**
 * Profile avatar choices. Two sources ("Both"):
 *  - card artwork (hosted on bobagi.space - no upload needed), and
 *  - custom images you drop into `web/static/avatars/` (served at `/avatars/<file>`).
 *
 * To add a custom avatar: put a PNG in `web/static/avatars/` and add its
 * `/avatars/<file>` path to CUSTOM_AVATARS below.
 */
const CARD_IMAGE_BASE = 'https://bobagi.space/images/cards';

// A curated set of card art that reads well as a portrait avatar.
const CARD_ART_AVATAR_NUMBERS = [1, 8, 13, 16, 18, 19, 21, 23, 26, 28, 31, 32];

export const CARD_ART_AVATARS = CARD_ART_AVATAR_NUMBERS.map((n) => `${CARD_IMAGE_BASE}/${n}.png`);

// Custom avatars served from web/static/avatars/ - fill this in as you upload files.
export const CUSTOM_AVATARS: string[] = [];

export const AVATAR_OPTIONS: string[] = [...CARD_ART_AVATARS, ...CUSTOM_AVATARS];

export const DEFAULT_AVATAR_URL = `${CARD_IMAGE_BASE}/23.png`;
