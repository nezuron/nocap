# Contributing to NoCap Detector

Thanks for helping improve NoCap! The easiest way to contribute is by adding training examples.

## Adding Training Data

The model learns from labeled tweet examples. More diverse examples = better accuracy.

### How to Submit Examples

**Option 1: Open an Issue**
1. Go to [Issues](https://github.com/nezuron/nocap/issues)
2. Create a new issue with title: `Training Data: [Sponsored/Organic]`
3. Paste your examples (one per line)

**Option 2: Pull Request**
1. Fork the repo
2. Edit the relevant file in `training/data/`:
   - `sponsored_tweets.json` - for sponsored/promotional tweets
   - `organic_tweets.json` - for authentic/organic tweets
3. Add your examples to the `tweets` array
4. Submit a PR

### What Makes a Good Example

**Sponsored tweets should have:**
- Discount codes ("Use code SAVE20")
- Affiliate language ("Link in bio", "Shop now")
- Partnership mentions ("Thanks to @Brand", "Partnering with")
- Product promotions with CTAs
- Gifted/PR disclosure (even subtle ones)
- Crypto/finance shilling patterns

**Organic tweets should have:**
- Personal opinions (no product push)
- Casual conversations
- Memes, jokes, hot takes
- Life updates
- Complaints about products (not promotions)
- Questions to followers

### Rules

1. **English only** (for now)
2. **10+ words** - short tweets don't have enough signal
3. **No ambiguous tweets** - if you're unsure, don't add it
4. **Remove @usernames** - replace with `@BrandName` or `@someone`
5. **No real personal info** - anonymize if needed
6. **Balance matters** - try to keep sponsored/organic counts equal

### Example Format

```json
{
  "tweets": [
    "Existing tweet 1",
    "Existing tweet 2",
    "Your new tweet here"
  ]
}
```

## After Adding Data

If you submitted a PR, the maintainer will:
1. Run `npm run generate` to update the model
2. Run `npm run validate` to check accuracy
3. Merge if accuracy improves or stays stable

## Other Ways to Help

- **Report false positives/negatives** - Open an issue with the tweet text and what it was labeled vs what it should be
- **Test on your timeline** - Let us know how accurate it feels
- **Spread the word** - More users = more feedback = better model

## Questions?

Open an issue or reach out to [@nezuron_](https://twitter.com/nezuron_)
