/**
 * NoCap Detector - Content Script
 *
 * Observes Twitter DOM for tweets, extracts text,
 * classifies using ML, and injects visual badges.
 */

(function() {
  'use strict';

  // Track processed tweets to avoid re-analysis
  const processedTweets = new Set();

  // Batch processing queue
  let processingQueue = [];
  let isProcessingBatch = false;
  const BATCH_SIZE = 5;
  const BATCH_DELAY = 250; // ms - increased for less CPU usage
  const RESCAN_INTERVAL = 10000; // ms - reduced frequency
  const DEBUG = false;

  // Throttle state
  let pendingScan = false;
  let lastScanTime = 0;
  const SCAN_THROTTLE = 500; // ms

  /**
   * Check if a tweet is a reply (optimized - fast checks first)
   */
  function isReply(tweetElement) {
    // Fast check: Look for "Replying to" text (most common indicator)
    const innerText = tweetElement.innerText;
    if (innerText && (
      innerText.includes('Replying to') ||
      innerText.includes('En réponse à') ||
      innerText.includes('En respuesta a')
    )) {
      return true;
    }

    // Check if in thread view and not the main tweet
    const currentURL = window.location.href;
    if (currentURL.includes('/status/')) {
      const timeEl = tweetElement.querySelector('time');
      if (timeEl) {
        const link = timeEl.closest('a');
        const href = link?.getAttribute('href');
        if (href && !currentURL.includes(href)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Extract tweet text from a tweet element
   */
  function extractTweetText(tweetElement) {
    const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
    if (!textElement) {
      return null;
    }
    return textElement.textContent?.trim() || null;
  }

  /**
   * Get a unique identifier for a tweet
   */
  function getTweetId(tweetElement) {
    const timeElement = tweetElement.querySelector('time');
    if (timeElement) {
      const link = timeElement.closest('a');
      if (link) {
        return link.getAttribute('href');
      }
    }
    return null;
  }

  /**
   * Find the header row of a tweet (where we'll inject the badge)
   */
  function findBadgeInsertionPoint(tweetElement) {
    return tweetElement.querySelector('[data-testid="User-Name"]');
  }

  /**
   * Create a badge element
   */
  function createBadge(classification) {
    const badge = document.createElement('span');
    badge.className = 'nocap-badge';
    const confidencePercent = Math.round(classification.confidence * 100);

    if (classification.label === 'cap') {
      badge.classList.add('nocap-badge-cap');
      badge.innerHTML = `<span class="nocap-badge-icon">🧢</span><span class="nocap-badge-text">Cap</span>`;
      badge.title = `${confidencePercent}% likely sponsored · Click to report if wrong`;
    } else if (classification.label === 'sus') {
      badge.classList.add('nocap-badge-sus');
      badge.innerHTML = `<span class="nocap-badge-icon">🟡</span><span class="nocap-badge-text">Sus</span>`;
      badge.title = `${confidencePercent}% - might be sponsored · Click to report if wrong`;
    } else {
      return null;
    }

    badge.setAttribute('data-confidence', confidencePercent);
    badge.style.cursor = 'pointer';
    return badge;
  }

  /**
   * Open GitHub issue to report incorrect classification
   */
  function reportIncorrect(tweetText, label, confidence) {
    const correctLabel = label === 'cap' || label === 'sus' ? 'organic' : 'sponsored';
    const title = encodeURIComponent(`Training Data: ${correctLabel} tweet misclassified`);
    const body = encodeURIComponent(
`## Incorrect Classification

**Tweet text:**
\`\`\`
${tweetText.substring(0, 500)}
\`\`\`

**NoCap said:** ${label} (${confidence}%)
**Should be:** ${correctLabel}

---
*Submitted via NoCap feedback button*`
    );

    window.open(`https://github.com/nezuron/nocap/issues/new?title=${title}&body=${body}`, '_blank');
  }

  /**
   * Inject badge into a tweet
   */
  function injectBadge(tweetElement, classification) {
    if (classification.label === 'nocap') return;
    if (tweetElement.querySelector('.nocap-badge')) return;

    const insertionPoint = findBadgeInsertionPoint(tweetElement);
    if (!insertionPoint) return;

    const badge = createBadge(classification);
    if (badge) {
      const tweetText = extractTweetText(tweetElement) || '';
      const confidence = Math.round(classification.confidence * 100);

      badge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        reportIncorrect(tweetText, classification.label, confidence);
      });

      insertionPoint.appendChild(badge);
    }
  }

  /**
   * Process a single tweet
   */
  function processTweet(tweetElement) {
    const tweetId = getTweetId(tweetElement);
    if (!tweetId || processedTweets.has(tweetId)) {
      return;
    }

    // Mark as processed early to prevent duplicates
    processedTweets.add(tweetId);

    // Skip replies
    if (isReply(tweetElement)) {
      if (DEBUG) console.log('[NoCap] Skipping reply:', tweetId);
      return;
    }

    const text = extractTweetText(tweetElement);
    if (!text || text.length < 10) {
      return;
    }

    // Add to processing queue
    processingQueue.push({ element: tweetElement, text, id: tweetId });
    scheduleBatchProcessing();
  }

  /**
   * Schedule batch processing with requestIdleCallback if available
   */
  let batchScheduled = false;
  function scheduleBatchProcessing() {
    if (batchScheduled || isProcessingBatch) return;
    batchScheduled = true;

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        batchScheduled = false;
        processBatch();
      }, { timeout: BATCH_DELAY * 2 });
    } else {
      setTimeout(() => {
        batchScheduled = false;
        processBatch();
      }, BATCH_DELAY);
    }
  }

  /**
   * Process tweets in batch
   */
  async function processBatch() {
    if (isProcessingBatch || processingQueue.length === 0) {
      return;
    }

    isProcessingBatch = true;

    const batch = processingQueue.splice(0, BATCH_SIZE);
    const texts = batch.map(item => item.text);

    try {
      const results = await window.NoCap.classifyTweets(texts);
      batch.forEach((item, index) => {
        const classification = results[index];
        if (classification) {
          injectBadge(item.element, classification);
        }
      });
    } catch (error) {
      console.error('[NoCap] Batch processing error:', error);
    }

    isProcessingBatch = false;

    if (processingQueue.length > 0) {
      scheduleBatchProcessing();
    }
  }

  /**
   * Throttled scan for tweets
   */
  function throttledScan() {
    const now = Date.now();
    if (now - lastScanTime < SCAN_THROTTLE) {
      if (!pendingScan) {
        pendingScan = true;
        setTimeout(() => {
          pendingScan = false;
          throttledScan();
        }, SCAN_THROTTLE);
      }
      return;
    }

    lastScanTime = now;
    const tweets = document.querySelectorAll('article[data-testid="tweet"]');
    tweets.forEach(tweet => processTweet(tweet));
  }

  /**
   * Set up mutation observer for infinite scroll
   */
  function setupObserver() {
    let mutationTimeout = null;

    const observer = new MutationObserver((mutations) => {
      // Debounce: wait for mutations to settle
      if (mutationTimeout) return;

      mutationTimeout = setTimeout(() => {
        mutationTimeout = null;

        // Quick check if any mutations contain tweets
        let hasPotentialTweets = false;
        for (const mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
            hasPotentialTweets = true;
            break;
          }
        }

        if (hasPotentialTweets) {
          throttledScan();
        }
      }, 150);
    });

    // Try to observe only the timeline container for better performance
    const timelineContainer = document.querySelector('[data-testid="primaryColumn"]') ||
                              document.querySelector('main') ||
                              document.body;

    observer.observe(timelineContainer, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  /**
   * Initialize content script
   */
  function initialize() {
    console.log('[NoCap] Content script initializing...');

    if (window.NoCap && window.NoCap.isReady()) {
      onDetectorReady();
    } else {
      window.addEventListener('nocap-ready', onDetectorReady);
    }
  }

  /**
   * Called when detector is ready
   */
  function onDetectorReady() {
    console.log('[NoCap] Detector ready, scanning for tweets...');

    // Initial scan
    throttledScan();

    // Set up observer for new tweets
    setupObserver();

    // Periodic rescan at reduced frequency
    setInterval(throttledScan, RESCAN_INTERVAL);

    console.log('[NoCap] Content script ready!');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
