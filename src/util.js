(() => {
  const DEBUG = true;

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function jitterDelay(minMs, maxMs) {
    return sleep(randomInt(minMs, maxMs));
  }

  function text(node) {
    return (node?.innerText || node?.textContent || '').trim();
  }

  function normalizedText(node) {
    return text(node).replace(/\s+/g, ' ').toLowerCase();
  }

  function log(...args) {
    if (DEBUG) {
      console.log('[ClickGremlin]', ...args);
    }
  }

  function toErrorMessage(error) {
    if (!error) return 'Unknown error';
    if (typeof error === 'string') return error;
    return error.message || JSON.stringify(error);
  }

  window.ClickGremlinUtil = {
    DEBUG,
    sleep,
    jitterDelay,
    text,
    normalizedText,
    log,
    toErrorMessage
  };
})();
