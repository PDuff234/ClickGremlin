(() => {
  const { jitterDelay, sleep, log, toErrorMessage } = window.ClickGremlinUtil;
  const adapter = window.ChaseAdapter;

  const COMMANDS = {
    SCAN: 'SCAN',
    ADD_ALL: 'ADD_ALL',
    STOP: 'STOP',
    GET_STATE: 'GET_STATE'
  };

  const config = {
    minDelayMs: 700,
    maxDelayMs: 1500,
    maxOffersPerRun: 250,
    maxStableScrollCycles: 3,
    clickVerifyDelayMs: 1200
  };

  const runState = {
    statusText: 'Ready.',
    offersFound: 0,
    addable: 0,
    addedNow: 0,
    skipped: 0,
    errors: 0,
    running: false,
    stopRequested: false,
    lastRunAt: null,
    recentErrors: []
  };

  function persistRunSummary() {
    chrome.storage.local.set({
      clickGremlinLastRun: {
        timestamp: new Date().toISOString(),
        offersFound: runState.offersFound,
        addable: runState.addable,
        addedNow: runState.addedNow,
        skipped: runState.skipped,
        errors: runState.errors,
        recentErrors: runState.recentErrors.slice(-10)
      }
    });
  }

  function publishState() {
    const payload = {
      statusText: runState.statusText,
      offersFound: runState.offersFound,
      addable: runState.addable,
      addedNow: runState.addedNow,
      skipped: runState.skipped,
      errors: runState.errors,
      running: runState.running,
      stopRequested: runState.stopRequested,
      lastRunAt: runState.lastRunAt
    };

    chrome.runtime.sendMessage({ type: 'RUN_STATE', payload }).catch(() => {
      // Popup may not be open.
    });

    return payload;
  }

  function setStatus(statusText) {
    runState.statusText = statusText;
    log(statusText);
    publishState();
  }

  function resetCountersForNewRun() {
    runState.offersFound = 0;
    runState.addable = 0;
    runState.addedNow = 0;
    runState.skipped = 0;
    runState.errors = 0;
    runState.recentErrors = [];
    runState.lastRunAt = new Date().toISOString();
  }

  function recordError(error) {
    runState.errors += 1;
    runState.recentErrors.push(toErrorMessage(error));
    publishState();
  }

  function getOfferSnapshot() {
    const cards = adapter.findOfferCards();
    const snapshots = cards.map((card) => {
      const added = adapter.isOfferAdded(card);
      const addButton = adapter.findAddButton(card);
      return {
        card,
        title: adapter.parseOfferTitle(card),
        added,
        hasAddButton: Boolean(addButton),
        addButton
      };
    });

    const addableSnapshots = snapshots.filter((offer) => !offer.added && offer.hasAddButton);

    runState.offersFound = snapshots.length;
    runState.addable = addableSnapshots.length;
    publishState();

    return { snapshots, addableSnapshots };
  }

  async function loadMoreOffers() {
    let stableCycles = 0;
    let previousCount = 0;

    for (let cycle = 0; cycle < 10; cycle += 1) {
      if (runState.stopRequested) {
        return;
      }

      const currentCount = adapter.findOfferCards().length;
      if (currentCount <= previousCount) {
        stableCycles += 1;
      } else {
        stableCycles = 0;
      }

      if (stableCycles >= config.maxStableScrollCycles) {
        break;
      }

      previousCount = currentCount;
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await sleep(600);

      const loadMoreButton = adapter.findLoadMoreButton();
      if (loadMoreButton) {
        loadMoreButton.click();
        await sleep(800);
      }
    }
  }

  function assertSafeToRun() {
    if (!adapter.looksLikeChaseOffersPage()) {
      throw new Error('This page does not look like Chase Offers. Open Chase offers and retry.');
    }

    if (adapter.detectInterstitial()) {
      throw new Error('Security interstitial detected (CAPTCHA/verification). Run aborted.');
    }
  }

  async function handleScan() {
    assertSafeToRun();
    runState.stopRequested = false;
    setStatus('Scanning offers…');

    await loadMoreOffers();
    const { snapshots } = getOfferSnapshot();
    setStatus(`Scan complete. Found ${snapshots.length} offers, ${runState.addable} addable.`);
    persistRunSummary();
  }

  async function clickAddButtonForOffer(offer) {
    if (!offer.addButton) {
      runState.skipped += 1;
      return;
    }

    offer.addButton.click();
    await sleep(config.clickVerifyDelayMs);

    if (adapter.isOfferAdded(offer.card)) {
      runState.addedNow += 1;
      return;
    }

    runState.skipped += 1;
  }

  async function handleAddAll() {
    assertSafeToRun();

    runState.stopRequested = false;
    runState.running = true;
    setStatus('Preparing add run…');

    await loadMoreOffers();
    let { addableSnapshots } = getOfferSnapshot();
    const maxToProcess = Math.min(config.maxOffersPerRun, addableSnapshots.length);

    setStatus(`Adding up to ${maxToProcess} offers with safe pacing…`);

    for (let i = 0; i < maxToProcess; i += 1) {
      if (runState.stopRequested) {
        setStatus('Stopped by user.');
        break;
      }

      if (adapter.detectInterstitial()) {
        throw new Error('Potential verification interstitial detected while running. Stopping.');
      }

      const offer = addableSnapshots[i];
      setStatus(`Adding ${i + 1}/${maxToProcess}: ${offer.title}`);

      try {
        await clickAddButtonForOffer(offer);
      } catch (error) {
        recordError(error);
        throw error;
      }

      publishState();
      await jitterDelay(config.minDelayMs, config.maxDelayMs);
    }

    if (!runState.stopRequested) {
      ({ addableSnapshots } = getOfferSnapshot());
      setStatus(`Run complete. Added ${runState.addedNow}. Remaining addable: ${addableSnapshots.length}.`);
    }

    runState.running = false;
    persistRunSummary();
    publishState();
  }

  function handleStop() {
    runState.stopRequested = true;
    runState.running = false;
    setStatus('Stop requested. Finishing current step…');
    persistRunSummary();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const command = message?.command;

    const execute = async () => {
      try {
        if (command === COMMANDS.SCAN) {
          resetCountersForNewRun();
          await handleScan();
        } else if (command === COMMANDS.ADD_ALL) {
          resetCountersForNewRun();
          await handleAddAll();
        } else if (command === COMMANDS.STOP) {
          handleStop();
        } else if (command === COMMANDS.GET_STATE) {
          // no-op
        } else {
          throw new Error(`Unknown command: ${command}`);
        }

        sendResponse({ ok: true, runState: publishState() });
      } catch (error) {
        recordError(error);
        runState.running = false;
        setStatus(`Error: ${toErrorMessage(error)}`);
        persistRunSummary();
        sendResponse({ ok: false, error: toErrorMessage(error), runState: publishState() });
      }
    };

    execute();
    return true;
  });

  publishState();
})();
