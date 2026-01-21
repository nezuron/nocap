/**
 * NoCap Detector - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  const accuracyEl = document.getElementById('accuracy');
  const tweetsCountEl = document.getElementById('tweets-count');

  // Load reference vectors to get accuracy info
  try {
    const response = await fetch(chrome.runtime.getURL('data/reference_vectors.json'));
    const data = await response.json();

    // Display accuracy
    const accuracy = Math.round(data.validation.overallAccuracy * 100);
    accuracyEl.textContent = accuracy + '%';

    // Update status
    statusEl.textContent = 'Active';
    statusEl.classList.remove('loading');
    statusEl.classList.add('ready');
  } catch (error) {
    console.error('Failed to load reference vectors:', error);
    statusEl.textContent = 'Error';
    accuracyEl.textContent = '--';
  }

  // Get tweets count from storage
  try {
    const result = await chrome.storage.local.get(['tweetsAnalyzed']);
    tweetsCountEl.textContent = result.tweetsAnalyzed || 0;
  } catch (error) {
    console.error('Failed to get tweets count:', error);
  }
});
