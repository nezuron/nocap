/**
 * Test script to verify the classifier works correctly
 */

import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load reference vectors
const vectorsPath = join(__dirname, '..', 'extension', 'data', 'reference_vectors.json');
const referenceVectors = JSON.parse(readFileSync(vectorsPath, 'utf-8'));

// Cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Classify embedding
function classify(embedding) {
  const { sponsored, organic } = referenceVectors.vectors;
  const sponsoredSim = cosineSimilarity(embedding, sponsored);
  const organicSim = cosineSimilarity(embedding, organic);
  const confidence = (sponsoredSim - organicSim + 1) / 2;

  let label;
  if (confidence >= 0.6) label = 'cap';
  else if (confidence >= 0.4) label = 'sus';
  else label = 'nocap';

  return { label, confidence: Math.round(confidence * 100) };
}

// Test tweets
const testTweets = [
  // Should be CAP (sponsored)
  "Use code SAVE20 for 20% off! Link in bio, this product changed my life!",
  "So excited to partner with @BrandName on this amazing product launch! #ad",
  "Gifted by @BeautyBrand but this serum is incredible, highly recommend!",

  // Should be NO CAP (organic)
  "Just woke up and my cat is giving me the death stare again",
  "Why does Monday feel like it lasts 3 days",
  "Hot take: pineapple on pizza is actually good",

  // Edge cases (might be SUS)
  "This coffee is really good, been drinking it every morning",
  "Finally found a good phone case after months of searching",
];

async function main() {
  console.log('🧪 NoCap Classifier Test\n');
  console.log('Loading USE model...');
  const model = await use.load();
  console.log('Model loaded!\n');
  console.log('='.repeat(60));

  for (const tweet of testTweets) {
    const embeddings = await model.embed([tweet]);
    const embedding = (await embeddings.array())[0];
    embeddings.dispose();

    const result = classify(embedding);

    const icon = result.label === 'cap' ? '🧢' : result.label === 'sus' ? '🟡' : '✅';
    const label = result.label.toUpperCase().padEnd(5);

    console.log(`${icon} ${label} (${result.confidence}%) "${tweet.substring(0, 50)}..."`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete!');
}

main().catch(console.error);
