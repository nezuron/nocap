# NoCap Detector 🧢

**Your timeline, no cap.**

A Chrome extension that uses AI to detect undisclosed sponsored content on Twitter/X in real-time.

## The Problem

Social media is saturated with undisclosed sponsorships. Influencers promote products without proper disclosure, making it impossible to tell authentic recommendations from paid ads. You deserve transparency.

## How It Works

NoCap Detector analyzes tweet language patterns using machine learning:

1. **You browse Twitter normally** - No setup required
2. **AI analyzes each tweet** - Using Universal Sentence Encoder
3. **Badges appear on suspicious tweets**:
   - 🧢 **Cap** - Likely sponsored content (>60% confidence)
   - 🟡 **Sus** - Might be sponsored (40-60% confidence)
4. **Hover for details** - See confidence percentage

```
┌─────────────────────────────────────────────────┐
│ @influencer                        🧢 Cap (75%) │
│                                                 │
│ OMG this product changed my life! Use code     │
│ SAVE20 for 20% off, link in bio!               │
└─────────────────────────────────────────────────┘
```

## Privacy

- **100% local** - All processing happens in your browser
- **No data collection** - Nothing is sent to any server
- **No tracking** - We don't know what you're browsing

## Installation

### From Source (Developer)

1. Clone/download this repository
2. Open Chrome → `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the `extension` folder
6. Go to Twitter/X - badges will appear automatically!

### From Chrome Web Store (Coming Soon)

Link will be added after approval.

## User Flow

```
Install Extension
       ↓
Browse Twitter/X
       ↓
Extension loads ML model (first time: ~10 seconds)
       ↓
Tweets are analyzed automatically
       ↓
Badges appear on suspicious tweets
       ↓
Hover to see confidence %
```

## Improving Accuracy

The model learns from labeled examples. To improve detection:

1. Edit `training/data/sponsored_tweets.json` - Add more sponsored examples
2. Edit `training/data/organic_tweets.json` - Add more organic examples
3. Run the training script:
   ```bash
   cd training
   npm install
   npm run generate
   ```
4. Reload the extension in Chrome

### Good Training Examples

**Sponsored tweets should have:**
- Discount codes, affiliate links
- "Link in bio" + product mentions
- Partnership/gifted language
- Clear promotional intent

**Organic tweets should have:**
- Personal opinions (no products)
- Conversations, memes, jokes
- News commentary
- Life updates

## Development

### Prerequisites
- Node.js 18+
- Chrome browser

### Commands
```bash
# Install training dependencies
cd training && npm install

# Generate new reference vectors
npm run generate

# Test classifier
node test_classifier.js
```

### Project Structure
```
NoCap/
├── extension/          # Chrome extension
│   ├── manifest.json
│   ├── detector.js     # ML logic
│   ├── content-main.js # DOM handling
│   └── model/          # Bundled ML model
└── training/           # Training pipeline
    ├── generate_vectors.js
    └── data/           # Training examples
```

## Tech Stack

- TensorFlow.js 3.21.0
- Universal Sentence Encoder Lite
- Chrome Extension Manifest V3
- Vanilla JavaScript

## Contributing

**Help make NoCap smarter!** The model improves with more training examples.

- **See a sponsored tweet we missed?** Add it to the training data
- **Got a false positive?** Report it so we can fix it

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to submit examples.

## Disclaimer

**This project is provided for educational and entertainment purposes only.**

- Predictions are made using machine learning and are **NOT guaranteed to be accurate**
- This tool does not constitute legal, financial, or professional advice
- Not affiliated with, endorsed by, or connected to Twitter/X or any mentioned brands
- The developers assume no liability for any decisions made based on this tool
- Use at your own risk

By using this extension, you acknowledge that sponsored content detection is inherently imperfect and should not be your sole basis for any conclusions about content authenticity.

## License

MIT - See [LICENSE](LICENSE) for details.

---

Made by [@nezuron_](https://twitter.com/nezuron_)
