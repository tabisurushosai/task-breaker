/**
 * Internationalization helper for task-breaker.
 * Wraps chrome.i18n.getMessage and provides DOM translation utility.
 */

/**
 * Gets the localized string for the specified message name.
 * @param messageName The name of the message, as specified in the messages.json file.
 * @param substitutions A single replacement string or an array of replacement strings.
 * @returns The localized message.
 */
export function t(messageName: string, substitutions?: string | string[]): string {
  return chrome.i18n.getMessage(messageName, substitutions) || messageName;
}

/**
 * Automatically translates the DOM elements with data-i18n and data-i18n-placeholder attributes.
 */
export function applyI18n(): void {
  const elements = document.querySelectorAll('[data-i18n], [data-i18n-placeholder]');
  elements.forEach((element) => {
    // Translate text content
    const key = element.getAttribute('data-i18n');
    if (key) {
      const message = t(key);
      if (message && message !== key) {
        if (element instanceof HTMLInputElement && (element.type === 'button' || element.type === 'submit')) {
          element.value = message;
        } else {
          element.textContent = message;
        }
      }
    }

    // Translate placeholder
    const placeholderKey = element.getAttribute('data-i18n-placeholder');
    if (placeholderKey) {
      const message = t(placeholderKey);
      if (message && message !== placeholderKey && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
        element.placeholder = message;
      }
    }
  });
}
