const stateEls = {
  offersFound: document.getElementById('offersFound'),
  addable: document.getElementById('addable'),
  addedNow: document.getElementById('addedNow'),
  skipped: document.getElementById('skipped'),
  errors: document.getElementById('errors'),
  statusText: document.getElementById('statusText')
};

const COMMANDS = {
  SCAN: 'SCAN',
  ADD_ALL: 'ADD_ALL',
  STOP: 'STOP',
  GET_STATE: 'GET_STATE'
};

function render(runState = {}) {
  stateEls.offersFound.textContent = runState.offersFound ?? 0;
  stateEls.addable.textContent = runState.addable ?? 0;
  stateEls.addedNow.textContent = runState.addedNow ?? 0;
  stateEls.skipped.textContent = runState.skipped ?? 0;
  stateEls.errors.textContent = runState.errors ?? 0;
  stateEls.statusText.textContent = runState.statusText ?? 'Ready.';
}

async function getActiveTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab found.');
  }
  return tab.id;
}

async function sendToContent(command) {
  const tabId = await getActiveTabId();
  return chrome.tabs.sendMessage(tabId, { command });
}

async function trigger(command) {
  try {
    const response = await sendToContent(command);
    if (response?.runState) {
      render(response.runState);
    }
    if (!response?.ok) {
      stateEls.statusText.textContent = response?.error || 'Action failed.';
    }
  } catch (error) {
    stateEls.statusText.textContent = `Cannot talk to content script. Open Chase Offers page first.\n${error.message}`;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'RUN_STATE') {
    render(message.payload);
  }
});

document.getElementById('scanBtn').addEventListener('click', () => trigger(COMMANDS.SCAN));
document.getElementById('addAllBtn').addEventListener('click', () => trigger(COMMANDS.ADD_ALL));
document.getElementById('stopBtn').addEventListener('click', () => trigger(COMMANDS.STOP));

trigger(COMMANDS.GET_STATE);
