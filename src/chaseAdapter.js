(() => {
  const { normalizedText, text } = window.ClickGremlinUtil;

  const selectors = {
    offersContainer: [
      'div._1ljaqoe3'
    ],
    offerCards: [
      '[data-testid="commerce-tile"]',
      '[data-cy="commerce-tile"]',
      '.offerTileGridItemContainer [role="button"]',
      '[data-testid*="offer"]',
      '[class*="offer"][class*="card"]',
      '[class*="OfferCard"]',
      'article'
    ],
    addButton: [
      '[data-testid="commerce-tile-button"]',
      '[data-cy="commerce-tile-button"]',
      '.r9jbijb',
      'button',
      '[role="button"]',
      'a[role="button"]'
    ],
    detailAddButton: [
      '[data-testid*="add"][role="button"]',
      '[data-cy*="add"][role="button"]',
      'button',
      '[role="button"]',
      'a[role="button"]'
    ],
    detailAddedMarker: [
      '[data-testid*="success"]',
      '[data-testid*="added"]',
      '[data-cy*="success"]',
      '[data-cy*="added"]'
    ],
    loadMore: [
      'button',
      '[role="button"]',
      'a[role="button"]'
    ]
  };

  const textPatterns = {
    add: [/^add$/i, /add to card/i, /activate/i],
    added: [/added/i, /on card/i, /activated/i],
    loadMore: [/load more/i, /show more/i, /see more/i],
    interstitial: [/captcha/i, /verify( it'?s)? you/i, /security check/i, /unusual activity/i],
    chaseOffersSignals: [/chase offers/i, /cash back/i, /add to card/i, /commerce-tile/i]
  };

  function looksLikeChaseOffersPage() {
    const hostOk = location.hostname.includes('chase.com');
    const path = `${location.pathname} ${location.hash}`.toLowerCase();
    const pathHint = /offer|cashback|merchant/.test(path);
    const pageText = normalizedText(document.body);
    const hasOffersContainer = selectors.offersContainer.some((selector) => document.querySelector(selector));
    const hasOfferTile = Boolean(document.querySelector('[data-testid="commerce-tile"], [data-cy="commerce-tile"]'));
    const pageHint = hasOffersContainer || hasOfferTile || textPatterns.chaseOffersSignals.some((pattern) => pattern.test(pageText));
    return hostOk && (pathHint || pageHint);
  }

  function findOfferCards() {
    const collected = new Set();
    selectors.offerCards.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const content = normalizedText(node);
        const hasOfferSignals = /add to card|expires|offer|cash back|earn|success added/.test(content);
        if (hasOfferSignals) {
          collected.add(node);
        }
      });
    });

    return Array.from(collected);
  }

  function findTextMatchWithin(card, selectorList, patterns) {
    for (const selector of selectorList) {
      const candidates = card.querySelectorAll(selector);
      for (const node of candidates) {
        const value = text(node);
        if (patterns.some((pattern) => pattern.test(value))) {
          return node;
        }
      }
    }
    return null;
  }

  function isOfferAdded(card) {
    if (card.querySelector('[data-testid="offer-tile-alert-container-success"], [data-cy="offer-tile-alert-container-success"]')) {
      return true;
    }

    const aria = (card.getAttribute('aria-label') || '').toLowerCase();
    if (aria.includes('success added') || aria.includes('added to card')) {
      return true;
    }

    const cardText = normalizedText(card);
    return textPatterns.added.some((p) => p.test(cardText));
  }

  function findAddButton(card) {
    const directButton = card.querySelector('[data-testid="commerce-tile-button"], [data-cy="commerce-tile-button"]');
    if (directButton) return directButton;

    const iconContainer = card.querySelector('.r9jbijb');
    if (iconContainer) return iconContainer;

    return findTextMatchWithin(card, selectors.addButton, textPatterns.add);
  }

  function findDetailAddButton() {
    return findTextMatchWithin(document, selectors.detailAddButton, textPatterns.add);
  }

  function detailPageIndicatesAdded() {
    const marker = selectors.detailAddedMarker.some((selector) => document.querySelector(selector));
    if (marker) {
      return true;
    }

    const pageText = normalizedText(document.body);
    return textPatterns.added.some((pattern) => pattern.test(pageText));
  }

  function findLoadMoreButton() {
    return findTextMatchWithin(document, selectors.loadMore, textPatterns.loadMore);
  }

  function parseOfferTitle(card) {
    const heading = card.querySelector('h1, h2, h3, h4, [class*="title"], [class*="merchant"]');
    return text(heading) || text(card).slice(0, 120);
  }

  function detectInterstitial() {
    const pageText = normalizedText(document.body);
    return textPatterns.interstitial.some((pattern) => pattern.test(pageText));
  }

  window.ChaseAdapter = {
    selectors,
    looksLikeChaseOffersPage,
    findOfferCards,
    isOfferAdded,
    findAddButton,
    findDetailAddButton,
    detailPageIndicatesAdded,
    findLoadMoreButton,
    parseOfferTitle,
    detectInterstitial
  };
})();
