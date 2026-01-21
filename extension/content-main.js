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
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 100; // ms
  const DEBUG = false; // Set to true to see reply detection logs

  /**
   * Check if a tweet is a reply (not a main post)
   */
  function isReply(tweetElement) {
    // Method 1: Check for "Replying to" link element (most reliable)
    // Twitter shows replies with a "Replying to @username" link
    const replyingToLinks = tweetElement.querySelectorAll('a[href^="/"]');
    for (const link of replyingToLinks) {
      const parent = link.parentElement;
      if (parent && parent.textContent) {
        const text = parent.textContent.toLowerCase();
        if (text.includes('replying to') || text.includes('en réponse') || text.includes('en respuesta')) {
          return true;
        }
      }
    }

    // Method 2: Check for "Replying to" anywhere in the tweet's inner text
    const tweetInnerText = tweetElement.innerText || '';
    if (tweetInnerText.includes('Replying to') ||
        tweetInnerText.includes('replying to') ||
        tweetInnerText.includes('En réponse à') ||
        tweetInnerText.includes('En respuesta a')) {
      return true;
    }

    // Method 3: Check for the reply context div that appears above tweet text
    // Twitter wraps "Replying to" in a div before the actual tweet content
    const tweetTextContainer = tweetElement.querySelector('[data-testid="tweetText"]');
    if (tweetTextContainer) {
      // Check siblings before the tweet text for reply indicators
      let sibling = tweetTextContainer.parentElement?.previousElementSibling;
      while (sibling) {
        const siblingText = sibling.textContent?.toLowerCase() || '';
        if (siblingText.includes('replying to')) {
          return true;
        }
        sibling = sibling.previousElementSibling;
      }
    }

    // Method 4: Check if we're in a thread view and this isn't the main tweet
    const currentURL = window.location.href;
    if (currentURL.includes('/status/')) {
      const tweetLink = tweetElement.querySelector('a[href*="/status/"] time');
      if (tweetLink) {
        const tweetHref = tweetLink.closest('a')?.getAttribute('href');
        if (tweetHref && !currentURL.includes(tweetHref)) {
          return true;
        }
      }
    }

    // Method 5: Check for vertical thread connector line
    const parentCell = tweetElement.closest('[data-testid="cellInnerDiv"]');
    if (parentCell) {
      // Check for the blue connecting line in previous sibling
      const prevElement = parentCell.previousElementSibling;
      if (prevElement) {
        const hasConnector = prevElement.querySelector('[style*="background-color: rgb(29, 155, 240)"]');
        if (hasConnector) {
          return true;
        }
      }
    }

    // Method 6: Check for social context mentioning reply
    const socialContext = tweetElement.querySelector('[data-testid="socialContext"]');
    if (socialContext?.textContent?.toLowerCase().includes('repl')) {
      return true;
    }

    return false;
  }

  /**
   * Extract tweet text from a tweet element
   */
  function extractTweetText(tweetElement) {
    // Find the tweet text container
    const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
    if (!textElement) {
      return null;
    }

    // Get text content, preserving some structure
    let text = '';
    textElement.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      } else if (node.tagName === 'IMG') {
        // Handle emojis (they're images on Twitter)
        text += node.alt || '';
      } else if (node.tagName === 'A') {
        // Include link text but not URLs
        const href = node.getAttribute('href');
        if (href && !href.startsWith('http')) {
          text += node.textContent;
        }
      } else {
        text += node.textContent || '';
      }
    });

    return text.trim();
  }

  /**
   * Get a unique identifier for a tweet
   */
  function getTweetId(tweetElement) {
    // Try to find the tweet link which contains the ID
    const timeElement = tweetElement.querySelector('time');
    if (timeElement) {
      const link = timeElement.closest('a');
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          return href;
        }
      }
    }

    // Fallback: use the tweet text hash
    const text = extractTweetText(tweetElement);
    if (text) {
      return 'text:' + hashString(text);
    }

    return null;
  }

  /**
   * Simple string hash function
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * Find the header row of a tweet (where we'll inject the badge)
   */
  function findBadgeInsertionPoint(tweetElement) {
    // Look for the user name container in the tweet header
    // Twitter structure: article > div > div > div (header row) > div (user info)
    const userNameLink = tweetElement.querySelector('[data-testid="User-Name"]');
    if (userNameLink) {
      return userNameLink;
    }

    // Fallback: find the first link with a username pattern
    const links = tweetElement.querySelectorAll('a[href^="/"]');
    for (const link of links) {
      if (link.querySelector('span') && !link.querySelector('img')) {
        return link.parentElement;
      }
    }

    return null;
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
      badge.title = `${confidencePercent}% likely sponsored`;
    } else if (classification.label === 'sus') {
      badge.classList.add('nocap-badge-sus');
      badge.innerHTML = `<span class="nocap-badge-icon">🟡</span><span class="nocap-badge-text">Sus</span>`;
      badge.title = `${confidencePercent}% - might be sponsored`;
    } else {
      // Don't show badge for "no cap" tweets (reduces noise)
      return null;
    }

    // Add confidence tooltip on hover
    badge.setAttribute('data-confidence', confidencePercent);

    return badge;
  }

  /**
   * Inject badge into a tweet
   */
  function injectBadge(tweetElement, classification) {
    // Don't inject for "no cap" tweets
    if (classification.label === 'nocap') {
      return;
    }

    const insertionPoint = findBadgeInsertionPoint(tweetElement);
    if (!insertionPoint) {
      return;
    }

    // Check if badge already exists
    if (tweetElement.querySelector('.nocap-badge')) {
      return;
    }

    const badge = createBadge(classification);
    if (badge) {
      // Insert badge after the user name
      insertionPoint.appendChild(badge);
    }
  }

  /**
   * Process a single tweet
   */
  async function processTweet(tweetElement) {
    const tweetId = getTweetId(tweetElement);
    if (!tweetId || processedTweets.has(tweetId)) {
      return;
    }

    // Skip replies - only analyze main posts
    if (isReply(tweetElement)) {
      if (DEBUG) console.log('[NoCap] Skipping reply:', tweetId);
      processedTweets.add(tweetId);
      return;
    }
    if (DEBUG) console.log('[NoCap] Processing post:', tweetId);

    const text = extractTweetText(tweetElement);
    if (!text || text.length < 10) {
      // Skip very short tweets
      processedTweets.add(tweetId);
      return;
    }

    // Mark as processed
    processedTweets.add(tweetId);

    // Add to processing queue
    processingQueue.push({ element: tweetElement, text, id: tweetId });

    // Trigger batch processing
    scheduleBatchProcessing();
  }

  /**
   * Schedule batch processing
   */
  function scheduleBatchProcessing() {
    if (isProcessingBatch) {
      return;
    }

    setTimeout(processBatch, BATCH_DELAY);
  }

  /**
   * Process tweets in batch
   */
  async function processBatch() {
    if (isProcessingBatch || processingQueue.length === 0) {
      return;
    }

    isProcessingBatch = true;

    // Get batch
    const batch = processingQueue.splice(0, BATCH_SIZE);
    const texts = batch.map(item => item.text);

    try {
      // Classify all tweets in batch
      const results = await window.NoCap.classifyTweets(texts);

      // Inject badges
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

    // Process remaining queue
    if (processingQueue.length > 0) {
      scheduleBatchProcessing();
    }
  }

  /**
   * Find all tweet elements on the page
   */
  function findTweets() {
    return document.querySelectorAll('article[data-testid="tweet"]');
  }

  /**
   * Scan page for new tweets
   */
  function scanForTweets() {
    const tweets = findTweets();
    tweets.forEach(tweet => processTweet(tweet));
  }

  /**
   * Set up mutation observer for infinite scroll
   */
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      let hasNewTweets = false;

      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Check if the added node is a tweet or contains tweets
              if (node.matches && node.matches('article[data-testid="tweet"]')) {
                processTweet(node);
                hasNewTweets = true;
              } else if (node.querySelectorAll) {
                const tweets = node.querySelectorAll('article[data-testid="tweet"]');
                tweets.forEach(tweet => processTweet(tweet));
                if (tweets.length > 0) {
                  hasNewTweets = true;
                }
              }
            }
          }
        }
      }
    });

    // Observe the main content area
    observer.observe(document.body, {
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

    // Wait for detector to be ready
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
    scanForTweets();

    // Set up observer for new tweets
    setupObserver();

    // Periodic rescan (catches any missed tweets)
    setInterval(scanForTweets, 5000);

    console.log('[NoCap] Content script ready!');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
