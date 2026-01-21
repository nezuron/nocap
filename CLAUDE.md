# CLAUDE.md - NoCap Detector

## Project Overview
Chrome extension that uses ML (TensorFlow.js + Universal Sentence Encoder) to detect undisclosed sponsored content on Twitter/X, displaying visual badges on tweets.

## Tech Stack
- **Extension**: Chrome Manifest V3, Vanilla JavaScript
- **ML**: TensorFlow.js 3.21.0, Universal Sentence Encoder Lite
- **Training**: Node.js with TensorFlow.js

## Project Structure
```
NoCap/
├── extension/                 # Chrome extension (load this in chrome://extensions)
│   ├── manifest.json          # Extension config
│   ├── inject.js              # Script injector (content script)
│   ├── detector.js            # ML classification logic
│   ├── content-main.js        # DOM observation + badge injection
│   ├── styles.css             # Badge styling
│   ├── lib/                   # Bundled libraries
│   │   ├── tf.min.js          # TensorFlow.js
│   │   └── use.min.js         # USE library
│   ├── model/                 # Bundled USE model (~28MB)
│   │   ├── model.json
│   │   ├── vocab.json
│   │   └── group1-shard*of7   # Weight files
│   ├── data/
│   │   └── reference_vectors.json  # Pre-computed embeddings
│   └── popup/                 # Extension popup UI
│       ├── popup.html
│       └── popup.js
│
└── training/                  # Training pipeline (Node.js)
    ├── package.json
    ├── generate_vectors.js    # Main script - generates reference_vectors.json
    ├── test_classifier.js     # Test script
    └── data/
        ├── sponsored_tweets.json   # Labeled sponsored examples
        ├── organic_tweets.json     # Labeled organic examples
        └── test_set.json           # Held-out test data
```

## Key Concepts
- **Reference Vectors**: Average embeddings of sponsored/organic tweets used for classification
- **Cosine Similarity**: Compares tweet embedding to reference vectors
- **Confidence Score**: (sponsoredSim - organicSim + 1) / 2, normalized to 0-1
- **Thresholds**: >60% = Cap, 40-60% = Sus, <40% = No Cap

## Commands
```bash
# Generate new reference vectors (after updating training data)
cd training
npm install
npm run generate

# Test classifier accuracy
npm run validate
node test_classifier.js
```

## Coding Conventions
- Vanilla JS, no frameworks
- IIFE pattern for scripts (avoid global pollution)
- Console logs prefixed with `[NoCap]`
- Use `data-testid` attributes for Twitter DOM selection

## Important Files
- `training/data/sponsored_tweets.json` - Add more examples here to improve accuracy
- `training/data/organic_tweets.json` - Add more examples here to improve accuracy
- `extension/data/reference_vectors.json` - Generated file, don't edit manually
- `extension/detector.js:CONFIG.thresholds` - Adjust classification thresholds

## Do's
- Add diverse training examples (different tones, products, subtlety levels)
- Run `npm run generate` after updating training data
- Test on real Twitter timeline after changes
- Keep training data balanced (equal sponsored/organic)

## Don'ts
- Don't edit reference_vectors.json manually
- Don't add ambiguous tweets to training data
- Don't add non-English tweets (MVP is English-only)
- Don't add very short tweets (<10 words)
