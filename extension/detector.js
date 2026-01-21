/**
 * NoCap Detector - ML Classification Module
 *
 * Uses pre-loaded TensorFlow.js and Universal Sentence Encoder
 * to classify tweets as sponsored or organic.
 */

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    thresholds: {
      cap: 0.6,      // >60% = Cap (sponsored)
      sus: 0.4,      // 40-60% = Sus (uncertain)
      noCap: 0.4     // <40% = No Cap (organic)
    }
  };

  // State
  const state = {
    isLoading: false,
    isReady: false,
    model: null,
    referenceVectors: null,
    pendingClassifications: []
  };

  /**
   * Get extension base URL from data attribute set by inject.js
   */
  function getExtensionURL() {
    return document.documentElement.getAttribute('data-nocap-extension-url') || '';
  }

  /**
   * Load reference vectors from extension
   */
  async function loadReferenceVectors() {
    const baseURL = getExtensionURL();
    const url = baseURL + 'data/reference_vectors.json';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to load reference vectors');
    }
    return response.json();
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Classify a tweet based on its embedding
   */
  function classifyEmbedding(embedding) {
    const { sponsored, organic } = state.referenceVectors.vectors;

    const sponsoredSim = cosineSimilarity(embedding, sponsored);
    const organicSim = cosineSimilarity(embedding, organic);

    // Calculate confidence as relative similarity to sponsored content
    // Higher value = more likely sponsored
    const confidence = (sponsoredSim - organicSim + 1) / 2;

    let label;
    if (confidence >= CONFIG.thresholds.cap) {
      label = 'cap';
    } else if (confidence >= CONFIG.thresholds.sus) {
      label = 'sus';
    } else {
      label = 'nocap';
    }

    return {
      label,
      confidence,
      sponsoredSimilarity: sponsoredSim,
      organicSimilarity: organicSim
    };
  }

  /**
   * Classify a single tweet text
   */
  async function classifyTweet(text) {
    if (!state.isReady) {
      // Queue for later if not ready
      return new Promise((resolve) => {
        state.pendingClassifications.push({ text, resolve });
      });
    }

    try {
      // Generate embedding for the tweet
      const embeddings = await state.model.embed([text]);
      const embedding = await embeddings.array();
      embeddings.dispose(); // Clean up tensor

      return classifyEmbedding(embedding[0]);
    } catch (error) {
      console.error('[NoCap] Classification error:', error);
      return null;
    }
  }

  /**
   * Classify multiple tweets in batch (more efficient)
   */
  async function classifyTweets(texts) {
    if (!state.isReady) {
      // Wait for ready state
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (state.isReady) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    try {
      const embeddings = await state.model.embed(texts);
      const embeddingArrays = await embeddings.array();
      embeddings.dispose();

      return embeddingArrays.map(embedding => classifyEmbedding(embedding));
    } catch (error) {
      console.error('[NoCap] Batch classification error:', error);
      return texts.map(() => null);
    }
  }

  /**
   * Process any pending classifications
   */
  async function processPendingClassifications() {
    while (state.pendingClassifications.length > 0) {
      const { text, resolve } = state.pendingClassifications.shift();
      const result = await classifyTweet(text);
      resolve(result);
    }
  }

  /**
   * Initialize the detector
   */
  async function initialize() {
    if (state.isLoading || state.isReady) {
      return;
    }

    state.isLoading = true;
    console.log('[NoCap] Initializing detector...');

    try {
      // Check if TensorFlow.js is loaded
      if (typeof tf === 'undefined') {
        throw new Error('TensorFlow.js not loaded');
      }
      console.log('[NoCap] TensorFlow.js loaded');

      // Check if USE is loaded
      if (typeof use === 'undefined') {
        throw new Error('Universal Sentence Encoder not loaded');
      }
      console.log('[NoCap] USE library loaded');

      // Load reference vectors
      console.log('[NoCap] Loading reference vectors...');
      state.referenceVectors = await loadReferenceVectors();
      console.log('[NoCap] Reference vectors loaded:', {
        sponsored: state.referenceVectors.trainingStats.sponsoredCount,
        organic: state.referenceVectors.trainingStats.organicCount,
        accuracy: (state.referenceVectors.validation.overallAccuracy * 100).toFixed(1) + '%'
      });

      // Load USE model from bundled files
      console.log('[NoCap] Loading USE model from extension...');
      const startTime = Date.now();
      const baseURL = getExtensionURL();
      state.model = await use.load({
        modelUrl: baseURL + 'model/model.json',
        vocabUrl: baseURL + 'model/vocab.json'
      });
      console.log(`[NoCap] Model loaded in ${Date.now() - startTime}ms`);

      state.isReady = true;
      state.isLoading = false;

      // Process any pending classifications
      await processPendingClassifications();

      // Dispatch ready event
      window.dispatchEvent(new CustomEvent('nocap-ready'));
      console.log('[NoCap] Detector ready!');

    } catch (error) {
      console.error('[NoCap] Initialization failed:', error);
      state.isLoading = false;
    }
  }

  // Expose API globally
  window.NoCap = {
    initialize,
    classifyTweet,
    classifyTweets,
    isReady: () => state.isReady,
    getConfig: () => ({ ...CONFIG }),
    getStats: () => state.referenceVectors?.validation || null
  };

  // Auto-initialize
  initialize();

})();
