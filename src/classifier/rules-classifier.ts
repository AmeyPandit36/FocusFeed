import type { ClassifierInterface, ClassifierResult } from './classifier.interface';
import type { InterestProfile, VideoMetadata } from '../core/types';

export class RulesClassifier implements ClassifierInterface {
  readonly version = '1.0.0-rules';
  readonly name = 'DeterministicRulesClassifier';

  classify(video: VideoMetadata, profile: InterestProfile): ClassifierResult {
    const titleLower = (video.title || '').toLowerCase().trim();
    const channelLower = (video.channelName || '').toLowerCase().trim();
    const handleLower = (video.channelHandle || '').toLowerCase().trim();

    // 1. Explicitly Blocked Channels
    for (const blockedChannel of profile.blockedChannels) {
      const bLower = blockedChannel.toLowerCase().trim();
      if (bLower && (channelLower === bLower || channelLower.includes(bLower) || handleLower === bLower)) {
        return {
          decision: 'blocked',
          matchedInterest: `channel:${blockedChannel}`,
          confidence: 1.0,
          reasonCode: 'EXPLICIT_BLOCKED_CHANNEL'
        };
      }
    }

    // 2. Explicitly Blocked Topics / Blocked Custom Keywords
    const allBlockedTerms = [
      ...profile.blockedTopics,
      ...(profile.customKeywords?.blocked || [])
    ];

    for (const term of allBlockedTerms) {
      const termLower = term.toLowerCase().trim();
      if (termLower && this.containsPhrase(titleLower, termLower)) {
        return {
          decision: 'blocked',
          matchedInterest: `blocked_term:${term}`,
          confidence: 1.0,
          reasonCode: 'EXPLICIT_BLOCKED_TOPIC'
        };
      }
    }

    // 3. Explicitly Allowed Channels
    for (const allowedChannel of profile.allowedChannels) {
      const aLower = allowedChannel.toLowerCase().trim();
      if (aLower && (channelLower === aLower || channelLower.includes(aLower) || handleLower === aLower)) {
        return {
          decision: 'allowed',
          matchedInterest: `channel:${allowedChannel}`,
          confidence: 1.0,
          reasonCode: 'EXPLICIT_ALLOWED_CHANNEL'
        };
      }
    }

    // 4. Explicitly Allowed Topics / Allowed Custom Keywords
    const allAllowedTerms = [
      ...profile.allowedTopics,
      ...(profile.customKeywords?.allowed || [])
    ];

    for (const term of allAllowedTerms) {
      const termLower = term.toLowerCase().trim();
      if (termLower && this.containsPhrase(titleLower, termLower)) {
        return {
          decision: 'allowed',
          matchedInterest: `allowed_term:${term}`,
          confidence: 0.95,
          reasonCode: 'EXPLICIT_ALLOWED_TOPIC'
        };
      }
    }

    // 5. Category and Subcategory matching
    let bestMatchScore = 0;
    let bestMatchedSubcategory = '';

    for (const category of profile.categories) {
      for (const subcategory of category.subcategories) {
        let subcatMatches = 0;
        let matchedKeyword = '';

        for (const kw of subcategory.keywords) {
          const kwLower = kw.toLowerCase().trim();
          if (kwLower && this.containsPhrase(titleLower, kwLower)) {
            subcatMatches++;
            if (!matchedKeyword) matchedKeyword = kw;
          }
        }

        if (subcatMatches > 0) {
          // Score based on matches and word length
          const score = Math.min(0.92, 0.60 + subcatMatches * 0.15);
          if (score > bestMatchScore) {
            bestMatchScore = score;
            bestMatchedSubcategory = `${category.name} → ${subcategory.name} (${matchedKeyword})`;
          }
        }
      }
    }

    if (bestMatchScore > 0) {
      const threshold = profile.minConfidenceThreshold ?? 0.65;
      if (bestMatchScore >= threshold) {
        return {
          decision: 'allowed',
          matchedInterest: bestMatchedSubcategory,
          confidence: bestMatchScore,
          reasonCode: 'CATEGORY_KEYWORD_MATCH'
        };
      } else {
        // Below threshold: mark as uncertain
        return {
          decision: 'uncertain',
          matchedInterest: bestMatchedSubcategory,
          confidence: bestMatchScore,
          reasonCode: 'LOW_CONFIDENCE_MATCH'
        };
      }
    }

    // 6. Out of interest
    return {
      decision: 'blocked',
      matchedInterest: undefined,
      confidence: 0.85,
      reasonCode: 'RULES_NO_INTEREST_MATCH'
    };
  }

  private containsPhrase(text: string, phrase: string): boolean {
    if (!phrase || !text) return false;
    // Word boundary match where applicable to avoid false positives (e.g. "rust" in "trust")
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\b|\\s)${escaped}(\\b|\\s|$)`, 'i');
    return regex.test(text);
  }
}
