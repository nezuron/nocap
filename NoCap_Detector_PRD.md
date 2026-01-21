# Product Requirements Document (PRD)
## NoCap Detector - Twitter Sponsorship Detection Extension

**Version:** 1.0  
**Last Updated:** January 2026  
**Owner:** @nezuron_  
**Status:** Pre-Development

---

## 1. Executive Summary

**Product Name:** NoCap Detector  
**Tagline:** "Your timeline, no cap"

**What it is:**  
A Chrome extension that uses AI (TensorFlow.js + Universal Sentence Encoder) to detect undisclosed sponsored content on Twitter/X in real-time, labeling tweets as "Cap" (sponsored) or "No Cap" (authentic).

**Why it matters:**  
Social media is saturated with undisclosed sponsorships that blur the line between authentic recommendations and paid ads. Users deserve transparency. NoCap Detector brings receipts to the timeline.

**Core Value Prop:**  
Browse Twitter knowing what's real and what's paid promo - automatically, in real-time, with zero effort.

---

## 2. Problem Statement

### Current Pain Points:
1. **Lack of transparency**: Many creators don't disclose sponsorships (despite FTC requirements)
2. **Erosion of trust**: Users can't tell authentic content from paid promos
3. **Time waste**: People act on "recommendations" that are actually ads
4. **Platform inaction**: Twitter/X doesn't enforce disclosure requirements

### User Impact:
- Users make purchasing decisions based on deceptive content
- Authentic creators lose credibility by association
- Platform trust decreases overall

---

## 3. Objectives & Success Metrics

### Primary Objectives:
1. Detect 70%+ of undisclosed sponsored content (MVP)
2. Keep false positive rate under 15%
3. Process tweets in <200ms per tweet
4. Achieve 1,000 active users within 3 months of launch

### Key Metrics:

**Engagement Metrics:**
- Daily Active Users (DAU)
- Tweets analyzed per user per session
- Extension retention rate (7-day, 30-day)

**Performance Metrics:**
- Detection accuracy (vs. manually labeled test set)
- False positive rate
- Average processing time per tweet
- Model load time

**Quality Metrics:**
- User-reported accuracy feedback
- Manual spot-check accuracy (weekly sample of 100 tweets)

**Growth Metrics:**
- Chrome Web Store installs
- Week-over-week growth rate
- User referrals / shares

---

## 4. Target Users

### Primary Persona: "Skeptical Scrollers"
- **Age:** 22-35
- **Behavior:** Active Twitter users, follow 200+ accounts, tech-savvy
- **Pain:** Tired of hidden ads, wants authentic content
- **Quote:** *"I can't tell what's real anymore, everyone's selling something"*

### Secondary Persona: "Anti-Shill Brigade"
- **Age:** 18-28
- **Behavior:** Calls out sponsored content in replies, follows drama
- **Pain:** Manually checking for disclosures is time-consuming
- **Quote:** *"I just want the receipts, expose the cap"*

### Tertiary Persona: "Brand Safety Monitors"
- **Age:** 25-40
- **Behavior:** Marketing/PR professionals monitoring competitors and influencers
- **Pain:** Need to track undisclosed sponsorships at scale
- **Quote:** *"We need to know who's playing by the rules"*

---

## 5. User Stories

### MVP User Stories:

**As a Twitter user, I want to:**
- See which tweets are likely sponsored so I can make informed decisions
- Browse my timeline without worrying about hidden ads
- Quickly identify authentic vs. paid content without manual checking

**As a content creator, I want to:**
- See how my tweets are classified to ensure I'm being transparent
- Understand what patterns trigger "Cap" labels

**As a brand safety professional, I want to:**
- Monitor competitor influencer campaigns
- Identify undisclosed sponsorships at scale

### Future User Stories (Post-MVP):
- Customize detection sensitivity
- Report false positives/negatives to improve the model
- Export data on accounts with high "Cap" rates
- See historical "Cap" scores for accounts

---

## 6. Feature Requirements

### 6.1 MVP Features (Launch)

#### **F1: Real-time Tweet Detection**
**Priority:** P0 (Must-have)  
**Description:** Automatically analyze tweets as they appear on timeline

**Requirements:**
- Detect tweets on page load
- Detect new tweets on infinite scroll
- Process tweets in <200ms
- Handle Twitter's dynamic DOM structure
- Work on twitter.com and x.com domains

**Acceptance Criteria:**
- ✅ Extension activates on Twitter/X
- ✅ Analyzes visible tweets within 3 seconds of page load
- ✅ Continues analyzing as user scrolls
- ✅ No visible lag or slowdown

---

#### **F2: Cap/No Cap Visual Indicators**
**Priority:** P0 (Must-have)  
**Description:** Display detection results with clear visual badges

**Requirements:**
- Show 🧢 "Cap" badge for likely sponsored content (>60% confidence)
- Show 🟡 "Sus" badge for uncertain cases (40-60% confidence)
- Show 🚫🧢 "No Cap" badge for authentic content (<40% confidence) - OPTIONAL for MVP
- Display confidence percentage on hover
- Badges appear next to username/timestamp

**Acceptance Criteria:**
- ✅ Badges visible and readable
- ✅ Don't break Twitter UI
- ✅ Hover shows confidence score
- ✅ Badges persist when scrolling

**UI Specs:**
```
High Confidence (>70%): 🧢 Cap (87%)
Medium Confidence (50-70%): 🧢 Cap
Low-Medium (40-50%): 🟡 Sus
Low (<40%): No badge OR 🚫🧢 No Cap (optional)
```

---

#### **F3: ML-Based Detection**
**Priority:** P0 (Must-have)  
**Description:** Use TensorFlow.js + Universal Sentence Encoder for semantic analysis

**Requirements:**
- Load pre-trained USE model (browser cache after first load)
- Compare tweet embeddings to reference vectors
- Calculate cosine similarity scores
- Classify based on similarity thresholds

**Acceptance Criteria:**
- ✅ Model loads within 5 seconds
- ✅ Uses cached model on subsequent visits
- ✅ Achieves 70%+ accuracy on test set
- ✅ Keeps false positive rate <15%

**Technical Specs:**
- Model: Universal Sentence Encoder
- Training data: Min 50 sponsored + 50 organic tweets
- Similarity metric: Cosine similarity
- Classification: Average similarity to reference vectors

---

#### **F4: Training Data Pipeline**
**Priority:** P0 (Must-have)  
**Description:** One-time setup script to generate reference vectors

**Requirements:**
- Accept JSON input of labeled tweets
- Generate embeddings using USE
- Save as JSON files for extension
- Provide clear setup instructions

**Acceptance Criteria:**
- ✅ Script runs successfully
- ✅ Generates valid JSON output
- ✅ Documentation explains how to add more training data
- ✅ Vectors integrate with extension

---

### 6.2 Post-MVP Features (Future Releases)

#### **F5: User Feedback Loop**
**Priority:** P1 (Should-have)  
**Description:** Allow users to report incorrect classifications

**Requirements:**
- "Report incorrect" button on badges
- Collect feedback (correct label + tweet ID)
- Store for future model retraining
- Show thank you message on submission

---

#### **F6: Customizable Sensitivity**
**Priority:** P1 (Should-have)  
**Description:** Let users adjust detection threshold

**Requirements:**
- Settings panel with slider (conservative ↔ aggressive)
- Adjust confidence threshold (40-80% range)
- Save preference to browser storage
- Apply to all tweets retroactively

---

#### **F7: Account-Level Stats**
**Priority:** P2 (Nice-to-have)  
**Description:** Show "Cap Score" for accounts over time

**Requirements:**
- Click account → see % of tweets flagged as Cap
- Show historical trend
- Compare to account average
- Export data as CSV

---

#### **F8: Whitelist/Blacklist**
**Priority:** P2 (Nice-to-have)  
**Description:** Manual overrides for specific accounts

**Requirements:**
- Always show Cap for blacklisted accounts
- Never show Cap for whitelisted accounts
- Manage list in settings

---

## 7. Technical Requirements

### 7.1 Technology Stack

**Extension:**
- Chrome Extension Manifest V3
- Vanilla JavaScript (no framework)
- TensorFlow.js v4.11.0
- Universal Sentence Encoder v1.3.3

**Training Pipeline:**
- Node.js v18+
- @tensorflow/tfjs-node v4.11.0
- @tensorflow-models/universal-sentence-encoder v1.3.3

**Storage:**
- Chrome Storage API (user preferences)
- Local JSON files (reference vectors)

### 7.2 Performance Requirements

| Metric | Target | Max Acceptable |
|--------|--------|----------------|
| Model load time | <3s | <5s |
| Per-tweet analysis | <100ms | <200ms |
| Memory usage | <50MB | <100MB |
| Extension size | <5MB | <10MB |

### 7.3 Browser Compatibility

**Supported:**
- Chrome 120+
- Edge 120+ (Chromium-based)

**Not Supported (MVP):**
- Firefox (different extension API)
- Safari (different extension API)
- Mobile browsers

### 7.4 Data & Privacy

**What we collect:**
- NOTHING - all processing happens locally
- No user data leaves browser
- No analytics/tracking in MVP

**What we access:**
- Read tweet content from DOM (publicly visible data only)
- No API calls to Twitter
- No access to DMs, private tweets, or user data

### 7.5 Security Requirements

- No external API calls (except CDN for TF.js libraries)
- All processing client-side
- No data transmission to servers
- Content Security Policy compliant
- No eval() or unsafe JavaScript

---

## 8. UX/UI Specifications

### 8.1 Visual Design

**Badge Design:**
```css
Cap Badge (High Confidence):
- Background: Linear gradient #ff4444 to #ff6b6b
- Icon: 🧢
- Text: "Cap (XX%)"
- Size: 11px font, 2px padding
- Border radius: 10px
- Shadow: 0 2px 4px rgba(255,68,68,0.2)

Sus Badge (Uncertain):
- Background: Linear gradient #ffa500 to #ffb733
- Icon: 🟡
- Text: "Sus"
- Same styling as Cap badge

No Cap Badge (Optional):
- Background: Linear gradient #44ff44 to #66ff66
- Icon: 🚫🧢
- Text: "No Cap"
- Same styling as Cap badge
```

**Placement:**
- Insert after username, before timestamp
- Inline with header row
- Doesn't push other elements

**Hover State:**
- Show confidence percentage
- Slight scale up (1.05x)
- Enhanced shadow

### 8.2 User Flows

**First-Time User Flow:**
1. Install extension from Chrome Web Store
2. Navigate to Twitter
3. See badges appear on timeline (no config needed)
4. Hover over badge to see confidence score
5. Continue browsing normally

**Power User Flow:**
1. Regular browsing with badges
2. Notice incorrect classification
3. Click "Report incorrect" (post-MVP)
4. Submit feedback
5. Continue browsing

**Settings Flow (Post-MVP):**
1. Click extension icon
2. See settings panel
3. Adjust sensitivity slider
4. Save preferences
5. See changes immediately on timeline

---

## 9. Content & Copy

### Extension Listing (Chrome Web Store)

**Name:** NoCap Detector

**Short Description:**  
"Detect undisclosed sponsored tweets. See what's real, no cap. 🚫🧢"

**Long Description:**
```
Stop the cap on your timeline.

NoCap Detector uses AI to automatically spot undisclosed sponsored content on Twitter/X. Browse with confidence knowing what's authentic and what's paid promo.

🧢 Cap - Sponsored/paid content detected
🟡 Sus - Might be sponsored
🚫🧢 No Cap - Authentic content

How it works:
• AI analyzes tweet language patterns in real-time
• Compares to known sponsored content
• Shows instant visual indicators
• 100% private - everything runs in your browser

No data collection. No tracking. Just transparency.

Your timeline, no cap.
```

**Keywords:**
twitter, sponsored, ad detector, transparency, authentic, social media, influencer, disclosure

---

## 10. Launch Strategy

### 10.1 Pre-Launch (Weeks 1-2)
- [ ] Build MVP features
- [ ] Internal testing (5-10 beta testers)
- [ ] Create 100+ tweet training dataset
- [ ] Generate reference vectors
- [ ] Test on diverse Twitter accounts
- [ ] Chrome Web Store listing prepared

### 10.2 Soft Launch (Week 3)
- [ ] Submit to Chrome Web Store
- [ ] Limited promotion to close network (50-100 users)
- [ ] Monitor for bugs/issues
- [ ] Collect initial accuracy feedback
- [ ] Iterate based on feedback

### 10.3 Public Launch (Week 4)
- [ ] Twitter announcement thread
- [ ] Post on Product Hunt
- [ ] Share in relevant communities (r/twitter, tech Twitter)
- [ ] Press outreach (TechCrunch, The Verge)
- [ ] Demo video/GIF showing it in action

### 10.4 Post-Launch (Ongoing)
- [ ] Weekly accuracy spot checks
- [ ] Monitor user reviews
- [ ] Update training data monthly
- [ ] Plan feature releases (feedback loop, settings)

---

## 11. Success Criteria

### Launch Success (30 days):
- ✅ 1,000+ installs
- ✅ 4.0+ star rating on Chrome Web Store
- ✅ <5% uninstall rate
- ✅ 70%+ detection accuracy on test set
- ✅ No critical bugs reported

### Long-term Success (90 days):
- ✅ 10,000+ active users
- ✅ 4.5+ star rating
- ✅ Featured in tech press (1+ publication)
- ✅ User-submitted training data pipeline launched
- ✅ 80%+ detection accuracy

---

## 12. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Twitter DOM changes break extension** | High | Medium | Monitor Twitter updates, build flexible selectors, quick patch releases |
| **Low detection accuracy** | High | Medium | Expand training dataset, A/B test different models, user feedback loop |
| **Performance issues (slow/laggy)** | Medium | Low | Batch processing, optimize model loading, throttle analysis |
| **Legal challenges from creators** | Medium | Low | Clear disclaimers, probability-based (not definitive), user education |
| **Chrome Web Store rejection** | High | Low | Follow all policies, no data collection, clear privacy policy |
| **Copycat extensions** | Low | High | Move fast, build brand, community engagement |
| **False positives harm creators** | Medium | Medium | Clear "probability" framing, user feedback, whitelist feature |

---

## 13. Open Questions

1. **Should we show "No Cap" badges for clearly organic content, or only show badges for suspicious content?**
   - Leaning: Only show Cap/Sus badges (reduces visual noise)

2. **What confidence threshold should trigger a badge?**
   - Need to A/B test: 40%, 50%, or 60%?

3. **Should we allow users to click badges for more info?**
   - Future feature: Click → see why it was flagged

4. **How do we handle retweets and quoted tweets?**
   - MVP: Analyze retweet content (not original tweet)
   - Future: Distinguish original vs. RT

5. **Monetization strategy?**
   - MVP: Free, no ads
   - Future: Premium features? (account stats, exports)

---

## 14. Timeline

**Week 1: Setup & Training**
- Day 1-2: Collect training data (100+ tweets)
- Day 3: Build vector generation script
- Day 4: Generate reference vectors
- Day 5: Validate accuracy on test set

**Week 2: Extension Development**
- Day 1-2: Extension scaffold + DOM reading
- Day 3: Integrate TensorFlow.js + USE
- Day 4: Detection logic + visual indicators
- Day 5: Testing + bug fixes

**Week 3: Testing & Refinement**
- Day 1-2: Beta testing with friends
- Day 3: Fix bugs + improve accuracy
- Day 4: Chrome Web Store submission
- Day 5: Marketing materials (video, screenshots)

**Week 4: Launch**
- Day 1: Soft launch to network
- Day 2-3: Monitor feedback
- Day 4: Public launch (Twitter, Product Hunt)
- Day 5: Press outreach

---

## 15. Appendix

### A. Training Data Guidelines

**Good Sponsored Examples:**
- Clear promotional language
- Product mentions with CTAs
- Discount codes
- "Link in bio" + product
- Partnership language
- Gifted/PR language

**Good Organic Examples:**
- Personal opinions without products
- Conversations/replies
- News commentary
- Memes and jokes
- Life updates
- Questions to followers

**Avoid:**
- Ambiguous cases (could go either way)
- Very short tweets (<10 words)
- Non-English tweets (MVP is English-only)

### B. Future Feature Ideas (Not Prioritized)

- Account "Cap Score" leaderboard
- Export detected sponsored tweets
- Browser notifications for high-cap accounts
- Community-sourced training data
- Multi-language support
- Integration with other platforms (Instagram, TikTok)
- API for developers
- Verified account verification (detect fake verification)

---

**Document Owner:** @nezuron_  
**Review Cycle:** Bi-weekly during development, monthly post-launch  
**Next Review:** End of Week 2 (post-MVP development)

---

**Approval Sign-off:**

- [ ] Product Lead: _______________
- [ ] Technical Lead: _______________
- [ ] Design Lead: _______________
