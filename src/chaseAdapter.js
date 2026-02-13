(() => {
  const { normalizedText, text } = window.ClickGremlinUtil;

  const selectors = {
    offerCards: [
      '[data-testid*="offer"]',
      '[class*="offer"][class*="card"]',
      '[class*="OfferCard"]',
      'article'
    ],
    addButton: [
      'button',
      '[role="button"]',
      'a[role="button"]'
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
    interstitial: [/captcha/i, /verify( it'?s)? you/i, /security check/i, /unusual activity/i]
  };

  function looksLikeChaseOffersPage() {
    const hostOk = location.hostname.includes('chase.com');
    const path = `${location.pathname} ${location.hash}`.toLowerCase();
    const pathHint = /offer|cashback|merchant/.test(path);
    const pageText = normalizedText(document.body);
    const pageHint = pageText.includes('chase offers') || pageText.includes('add to card');
    return hostOk && (pathHint || pageHint);
  }

  function findOfferCards() {
    const collected = new Set();
    selectors.offerCards.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        const content = normalizedText(node);
        const hasOfferSignals = /add to card|expires|offer|cash back|earn/.test(content);
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
    const cardText = normalizedText(card);
    return textPatterns.added.some((p) => p.test(cardText));
  }

  function findAddButton(card) {
    return findTextMatchWithin(card, selectors.addButton, textPatterns.add);
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
    findLoadMoreButton,
    parseOfferTitle,
    detectInterstitial
  };
})();
