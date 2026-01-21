/**
 * NoCap Detector - Script Injector
 *
 * Injects TF.js and detector into page context to avoid
 * content script isolation issues.
 */

(function() {
  'use strict';

  // Store extension URL for scripts to use
  const extensionURL = chrome.runtime.getURL('');

  // Inject a script file into the page
  function injectScript(file) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(file);
      script.onload = () => {
        resolve();
      };
      script.onerror = () => reject(new Error(`Failed to inject ${file}`));
      (document.head || document.documentElement).appendChild(script);
    });
  }

  // Inject CSS
  function injectCSS(file) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL(file);
    (document.head || document.documentElement).appendChild(link);
  }

  // Main injection sequence
  async function init() {
    console.log('[NoCap] Injecting scripts into page context...');

    try {
      // Pass extension URL to page context via data attribute
      document.documentElement.setAttribute('data-nocap-extension-url', extensionURL);

      // Inject CSS
      injectCSS('styles.css');

      // Inject TF.js first
      await injectScript('lib/tf.min.js');
      console.log('[NoCap] TensorFlow.js injected');

      // Then USE
      await injectScript('lib/use.min.js');
      console.log('[NoCap] USE library injected');

      // Then our detector
      await injectScript('detector.js');
      console.log('[NoCap] Detector injected');

      // Finally content script
      await injectScript('content-main.js');
      console.log('[NoCap] Content script injected');

    } catch (error) {
      console.error('[NoCap] Injection failed:', error);
    }
  }

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
