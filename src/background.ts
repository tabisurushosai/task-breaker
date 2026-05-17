/**
 * Background service worker for task-breaker.
 * Handles extension installation and initialization.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Initialize default storage values on first install
    chrome.storage.local.set({
      trial_start_ts: Date.now(),
      premium_unlocked: false,
      tasks: [],
      settings: {
        theme: 'auto',
        language: chrome.i18n.getUILanguage().startsWith('ja') ? 'ja' : 'en'
      }
    }, () => {
      console.log('Task Breaker initialized with default settings.');
    });
  }
});

console.log('Background worker started.');
