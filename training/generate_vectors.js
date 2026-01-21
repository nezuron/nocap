/**
 * NoCap Detector - Reference Vector Generation Script
 *
 * This script generates reference embeddings from labeled training data
 * using the Universal Sentence Encoder (USE).
 *
 * Usage: npm run generate
 */

import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const CONFIG = {
  sponsoredDataPath: join(__dirname, 'data', 'sponsored_tweets.json'),
  organicDataPath: join(__dirname, 'data', 'organic_tweets.json'),
  outputPath: join(__dirname, '..', 'extension', 'data', 'reference_vectors.json'),
  testSplitRatio: 0.2, // 20% held out for validation
};

/**
 * Load tweets from JSON file
 */
function loadTweets(filePath) {
  const data = JSON.parse(readFileSync(filePath, 'utf-8'));
  return data.tweets;
}

/**
 * Shuffle array in place (Fisher-Yates)
 */
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Split data into train and test sets
 */
function trainTestSplit(data, testRatio) {
  const shuffled = shuffle(data);
  const splitIndex = Math.floor(shuffled.length * (1 - testRatio));
  return {
    train: shuffled.slice(0, splitIndex),
    test: shuffled.slice(splitIndex),
  };
}

/**
 * Calculate average vector from array of embeddings
 */
function calculateAverageVector(embeddings) {
  const numVectors = embeddings.length;
  const vectorSize = embeddings[0].length;
  const average = new Array(vectorSize).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < vectorSize; i++) {
      average[i] += embedding[i];
    }
  }

  for (let i = 0; i < vectorSize; i++) {
    average[i] /= numVectors;
  }

  return average;
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
 * Classify a tweet embedding based on reference vectors
 */
function classify(embedding, sponsoredRef, organicRef) {
  const sponsoredSim = cosineSimilarity(embedding, sponsoredRef);
  const organicSim = cosineSimilarity(embedding, organicRef);

  // Calculate confidence as the relative similarity to sponsored content
  // Higher value = more likely sponsored
  const confidence = (sponsoredSim - organicSim + 1) / 2; // Normalize to 0-1

  return {
    isSponsored: sponsoredSim > organicSim,
    confidence,
    sponsoredSimilarity: sponsoredSim,
    organicSimilarity: organicSim,
  };
}

/**
 * Validate accuracy on test set
 */
function validateAccuracy(testSponsored, testOrganic, model, sponsoredRef, organicRef) {
  let correctSponsored = 0;
  let correctOrganic = 0;
  const results = {
    sponsored: { correct: 0, total: testSponsored.length, predictions: [] },
    organic: { correct: 0, total: testOrganic.length, predictions: [] },
  };

  // Test sponsored tweets
  for (const embedding of testSponsored) {
    const prediction = classify(embedding, sponsoredRef, organicRef);
    results.sponsored.predictions.push(prediction);
    if (prediction.isSponsored) {
      results.sponsored.correct++;
    }
  }

  // Test organic tweets
  for (const embedding of testOrganic) {
    const prediction = classify(embedding, sponsoredRef, organicRef);
    results.organic.predictions.push(prediction);
    if (!prediction.isSponsored) {
      results.organic.correct++;
    }
  }

  const totalCorrect = results.sponsored.correct + results.organic.correct;
  const totalTests = results.sponsored.total + results.organic.total;

  return {
    overallAccuracy: totalCorrect / totalTests,
    sponsoredAccuracy: results.sponsored.correct / results.sponsored.total,
    organicAccuracy: results.organic.correct / results.organic.total,
    falsePositiveRate: 1 - (results.organic.correct / results.organic.total),
    falseNegativeRate: 1 - (results.sponsored.correct / results.sponsored.total),
    details: results,
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🧢 NoCap Detector - Reference Vector Generation\n');
  console.log('=' .repeat(50));

  // Load training data
  console.log('\n📂 Loading training data...');
  const sponsoredTweets = loadTweets(CONFIG.sponsoredDataPath);
  const organicTweets = loadTweets(CONFIG.organicDataPath);
  console.log(`   Sponsored tweets: ${sponsoredTweets.length}`);
  console.log(`   Organic tweets: ${organicTweets.length}`);

  // Split into train/test sets
  console.log(`\n📊 Splitting data (${(1 - CONFIG.testSplitRatio) * 100}% train, ${CONFIG.testSplitRatio * 100}% test)...`);
  const sponsoredSplit = trainTestSplit(sponsoredTweets, CONFIG.testSplitRatio);
  const organicSplit = trainTestSplit(organicTweets, CONFIG.testSplitRatio);
  console.log(`   Training: ${sponsoredSplit.train.length} sponsored, ${organicSplit.train.length} organic`);
  console.log(`   Testing: ${sponsoredSplit.test.length} sponsored, ${organicSplit.test.length} organic`);

  // Load Universal Sentence Encoder
  console.log('\n🤖 Loading Universal Sentence Encoder model...');
  const startLoad = Date.now();
  const model = await use.load();
  console.log(`   Model loaded in ${Date.now() - startLoad}ms`);

  // Generate embeddings for training data
  console.log('\n🔢 Generating embeddings for training data...');
  const startEmbed = Date.now();

  const sponsoredTrainEmbeddings = await model.embed(sponsoredSplit.train);
  const organicTrainEmbeddings = await model.embed(organicSplit.train);

  const sponsoredTrainVectors = await sponsoredTrainEmbeddings.array();
  const organicTrainVectors = await organicTrainEmbeddings.array();

  console.log(`   Embeddings generated in ${Date.now() - startEmbed}ms`);

  // Calculate reference vectors (average of each class)
  console.log('\n📐 Calculating reference vectors...');
  const sponsoredRefVector = calculateAverageVector(sponsoredTrainVectors);
  const organicRefVector = calculateAverageVector(organicTrainVectors);
  console.log(`   Vector dimensions: ${sponsoredRefVector.length}`);

  // Generate embeddings for test data and validate
  console.log('\n🧪 Validating on test set...');
  const sponsoredTestEmbeddings = await model.embed(sponsoredSplit.test);
  const organicTestEmbeddings = await model.embed(organicSplit.test);

  const sponsoredTestVectors = await sponsoredTestEmbeddings.array();
  const organicTestVectors = await organicTestEmbeddings.array();

  const validation = validateAccuracy(
    sponsoredTestVectors,
    organicTestVectors,
    model,
    sponsoredRefVector,
    organicRefVector
  );

  console.log('\n' + '=' .repeat(50));
  console.log('📊 VALIDATION RESULTS');
  console.log('=' .repeat(50));
  console.log(`   Overall Accuracy:     ${(validation.overallAccuracy * 100).toFixed(1)}%`);
  console.log(`   Sponsored Accuracy:   ${(validation.sponsoredAccuracy * 100).toFixed(1)}%`);
  console.log(`   Organic Accuracy:     ${(validation.organicAccuracy * 100).toFixed(1)}%`);
  console.log(`   False Positive Rate:  ${(validation.falsePositiveRate * 100).toFixed(1)}%`);
  console.log(`   False Negative Rate:  ${(validation.falseNegativeRate * 100).toFixed(1)}%`);

  // Check if accuracy meets requirements
  const meetsRequirements = validation.overallAccuracy >= 0.7 && validation.falsePositiveRate <= 0.15;

  if (meetsRequirements) {
    console.log('\n✅ Accuracy meets PRD requirements (70%+ accuracy, <15% false positive rate)');
  } else {
    console.log('\n⚠️  Accuracy below target. Consider:');
    if (validation.overallAccuracy < 0.7) {
      console.log('   - Adding more diverse training examples');
    }
    if (validation.falsePositiveRate > 0.15) {
      console.log('   - Adding more organic examples to reduce false positives');
    }
  }

  // Save reference vectors
  console.log('\n💾 Saving reference vectors...');

  const outputDir = dirname(CONFIG.outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const output = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    modelInfo: {
      name: 'Universal Sentence Encoder',
      dimensions: sponsoredRefVector.length,
    },
    trainingStats: {
      sponsoredCount: sponsoredSplit.train.length,
      organicCount: organicSplit.train.length,
    },
    validation: {
      overallAccuracy: validation.overallAccuracy,
      sponsoredAccuracy: validation.sponsoredAccuracy,
      organicAccuracy: validation.organicAccuracy,
      falsePositiveRate: validation.falsePositiveRate,
      falseNegativeRate: validation.falseNegativeRate,
    },
    vectors: {
      sponsored: sponsoredRefVector,
      organic: organicRefVector,
    },
  };

  writeFileSync(CONFIG.outputPath, JSON.stringify(output, null, 2));
  console.log(`   Saved to: ${CONFIG.outputPath}`);

  // Save test set for future validation
  const testSetPath = join(__dirname, 'data', 'test_set.json');
  const testSet = {
    sponsored: sponsoredSplit.test,
    organic: organicSplit.test,
  };
  writeFileSync(testSetPath, JSON.stringify(testSet, null, 2));
  console.log(`   Test set saved to: ${testSetPath}`);

  console.log('\n🎉 Done! Reference vectors ready for extension.\n');

  // Cleanup tensors
  sponsoredTrainEmbeddings.dispose();
  organicTrainEmbeddings.dispose();
  sponsoredTestEmbeddings.dispose();
  organicTestEmbeddings.dispose();
}

main().catch(console.error);
