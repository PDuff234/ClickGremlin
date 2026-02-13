# ClickGremlin: Chase Offers Helper

ClickGremlin is a Manifest V3 browser extension that helps you scan and add eligible Chase cashback offers **while you are already logged in**.

## Features

- Human-in-the-loop controls in popup: **Scan**, **Add All**, **Stop**
- Live run summary: offers found, addable, added now, skipped, errors
- Safety guardrails:
  - Works only on Chase-like offers pages
  - Stops when verification/captcha-like interstitials are detected
  - Click pacing with jitter delay (700–1500ms)
  - Hard max offers per run (default 250)
- Adapter-style selector layer (`src/chaseAdapter.js`) for easier maintenance
- Stores non-sensitive run metadata in `chrome.storage.local`

## Install (Unpacked)

1. Open Chrome/Edge and go to extension management:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this repository folder (`ClickGremlin`).

## Usage

1. Log in to Chase in your browser normally.
2. Navigate to a Chase offers page.
3. Click the ClickGremlin extension icon.
4. Use popup buttons:
   - **Scan**: discovers offer cards and addable items
   - **Add All**: clicks each addable offer with safe pacing
   - **Stop**: kill switch; run stops within about one offer


## Current Chase DOM assumptions

The adapter is currently tuned for Chase commerce tiles using markers like:

- card: `data-testid="commerce-tile"`
- add control: `data-testid="commerce-tile-button"` (icon inside the tile)
- added state: `data-testid="offer-tile-alert-container-success"` or aria label containing `Success Added`
- offers container hint: `div._1ljaqoe3`

If Chase changes these attributes, update `src/chaseAdapter.js` selectors and rerun **Scan**.

## Debugging

- Open page DevTools Console to see `[ClickGremlin]` logs from content scripts.
- Open popup DevTools (right-click popup > Inspect) for popup messaging issues.
- If scan says page is unsupported, verify you are on a Chase offers section and not a login or challenge page.

## Development checks

```bash
npm install
npm test
```

`npm test` runs ESLint for this MVP.

## Security and non-goals

- No credential handling or password storage.
- No login automation (2FA/CAPTCHA bypass is out of scope).
- No stealth/headless botting.
- No off-site scraping.
