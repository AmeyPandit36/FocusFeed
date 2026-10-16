import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticClassifier, type SemanticModelPipeline } from '../../classifier/semantic-classifier';
import { createDefaultProfile } from '../../core/interest-profile';
import type { VideoMetadata } from '../../core/types';

describe('SemanticClassifier and Local Inference Fallback', () => {
  let classifier: SemanticClassifier;
  let mockPipeline: SemanticModelPipeline;

  beforeEach(() => {
    // Deterministic mock embedding generator for testing
    mockPipeline = {
      embed: async (text: string) => {
        const lower = text.toLowerCase();
        // Synthetic 4-dimensional vector based on keywords
        const isProgramming = lower.includes('python') || lower.includes('code') || lower.includes('developer');
        const isGaming = lower.includes('minecraft') || lower.includes('fortnite') || lower.includes('gameplay');
        const isTech = lower.includes('technology') || lower.includes('hardware');

        return [
          isProgramming ? 1.0 : 0.05,
          isGaming ? 1.0 : 0.05,
          isTech ? 0.8 : 0.1,
          0.2
        ];
      }
    };

    classifier = new SemanticClassifier(mockPipeline);
  });

  it('classifies relevant programming video as allowed using embeddings', async () => {
    const profile = createDefaultProfile();
    profile.allowedTopics = [];
    profile.customKeywords.allowed = [];
    const video: VideoMetadata = {
      id: 'sem-1',
      title: 'Python Software Development Architecture',
      channelName: 'FreeCodeCamp',
      surface: 'home',
      url: 'https://youtube.com/watch?v=sem-1'
    };

    const result = await classifier.classify(video, profile);
    expect(result.decision).toBe('allowed');
    expect(result.reasonCode).toContain('MATCH');
    expect(result.confidence).toBeGreaterThanOrEqual(0.65);
  });

  it('classifies gaming video as blocked when outside user interests', async () => {
    const profile = createDefaultProfile();
    const video: VideoMetadata = {
      id: 'sem-2',
      title: 'Minecraft Hardcore Survival Ep 44',
      channelName: 'GamingMaster',
      surface: 'home',
      url: 'https://youtube.com/watch?v=sem-2'
    };

    const result = await classifier.classify(video, profile);
    expect(result.decision).toBe('blocked');
  });

  it('gracefully falls back to RulesClassifier when pipeline fails or is not provided', async () => {
    const fallbackClassifier = new SemanticClassifier(); // No pipeline provided
    const profile = createDefaultProfile();
    profile.allowedChannels = ['@allowed-channel'];

    const video: VideoMetadata = {
      id: 'sem-3',
      title: 'Random Tech Video',
      channelName: '@allowed-channel',
      surface: 'home',
      url: 'https://youtube.com/watch?v=sem-3'
    };

    const result = await fallbackClassifier.classify(video, profile);
    expect(result.decision).toBe('allowed');
    expect(result.reasonCode).toBe('EXPLICIT_ALLOWED_CHANNEL');
  });
});
