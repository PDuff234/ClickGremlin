(() => {
  const { normalizedText, text } = window.ClickGremlinUtil;

  const selectors = {
    offersContainer: [
      'div._1ljaqoe3',
      '[data-testid="commerce-grid"]'
    ],
    offerCards: [
      '[data-testid="commerce-tile"]',
      '[data-cy="commerce-tile"]',
      '[data-testid*="offer"]',
      '[class*="offer"][class*="card"]',
      '[class*="OfferCard"]',
      'article'
    ],
    addButton: [
      '[data-testid="commerce-tile-button"]',
      '[data-cy="commerce-tile-button"]',
      'button',
      '[role="button"]',
      'a[role="button"]'
    ],
    addedMarkers: [
      '[data-testid="offer-tile-alert-container-success"]',
      '[data-cy="offer-tile-alert-container-success"]',
      '[data-testid="commerce-tile-icon"]'
    ],
    loadMore: [
      'button',
      '[role="button"]',
      'a[role="button"]'
    ]
  };

  const textPatterns = {
    add: [/^add$/i, /add to card/i, /activate/i],
    added: [/added/i, /on card/i, /activated/i, /success added/i],
    loadMore: [/load more/i, /show more/i, /see more/i],
    interstitial: [/captcha/i, /verify( it'?s)? you/i, /security check/i, /unusual activity/i]
  };

  function looksLikeChaseOffersPage() {
    const hostOk = location.hostname.includes('chase.com');
    const path = `${location.pathname} ${location.hash}`.toLowerCase();
    const pathHint = /offer|cashback|merchant/.test(path);
    const hasKnownContainer = selectors.offersContainer.some((selector) => document.querySelector(selector));
    const hasKnownCard = document.querySelector('[data-testid="commerce-tile"], [data-cy="commerce-tile"]');
    const pageText = normalizedText(document.body);
    const pageHint = pageText.includes('chase offers') || pageText.includes('cash back');
    return hostOk && (pathHint || hasKnownContainer || hasKnownCard || pageHint);
  }

  function findOfferCards() {
    const collected = new Set();
    selectors.offerCards.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const content = normalizedText(node);
        const isKnownTile = node.matches('[data-testid="commerce-tile"], [data-cy="commerce-tile"]');
        const hasOfferSignals = /add to card|expires|offer|cash back|earn|success added/.test(content);
        if (isKnownTile || hasOfferSignals) {
          collected.add(node);
        }
      });
    });

    return Array.from(collected);
  }

  function findTextMatchWithin(root, selectorList, patterns) {
    for (const selector of selectorList) {
      const candidates = root.querySelectorAll(selector);
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
    if (selectors.addedMarkers.some((selector) => card.querySelector(selector))) {
      return true;
    }

    const ariaLabel = (card.getAttribute('aria-label') || '').toLowerCase();
    if (ariaLabel.includes('success added')) {
      return true;
    }

    const cardText = normalizedText(card);
    return textPatterns.added.some((p) => p.test(cardText));
  }

  function findAddButton(card) {
    const specificIcon = card.querySelector('[data-testid="commerce-tile-button"], [data-cy="commerce-tile-button"]');
    if (specificIcon) {
      return specificIcon.closest('[role="button"]') || specificIcon;
    }

    return findTextMatchWithin(card, selectors.addButton, textPatterns.add);
  }

  function findLoadMoreButton() {
    return findTextMatchWithin(document, selectors.loadMore, textPatterns.loadMore);
  }

  function parseOfferTitle(card) {
    const heading = card.querySelector('h1, h2, h3, h4, [class*="title"], [class*="merchant"], .mds-body-small-heavier');
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
    findLoadMoreButton,
    parseOfferTitle,
    detectInterstitial
  };
})();
