import type { ClassifierInterface, ClassifierResult } from './classifier.interface';
import { RulesClassifier } from './rules-classifier';
import type { InterestProfile, VideoMetadata } from '../core/types';

export interface SemanticModelPipeline {
  embed(text: string): Promise<number[]>;
}

export class SemanticClassifier implements ClassifierInterface {
  readonly version = '2.0.0-semantic';
  readonly name = 'SemanticEmbeddingClassifier';

  private rulesFallback: RulesClassifier;
  private pipeline: SemanticModelPipeline | null = null;
  private isModelReady = false;
  private interestEmbeddingsCache = new Map<string, number[]>();

  constructor(pipeline?: SemanticModelPipeline) {
    this.rulesFallback = new RulesClassifier();
    if (pipeline) {
      this.pipeline = pipeline;
      this.isModelReady = true;
    }
  }

  setPipeline(pipeline: SemanticModelPipeline): void {
    this.pipeline = pipeline;
    this.isModelReady = true;
    this.interestEmbeddingsCache.clear();
  }

  async classify(video: VideoMetadata, profile: InterestProfile): Promise<ClassifierResult> {
    // 1. Explicit rules (channel blocking/allowing, explicit keywords) ALWAYS take absolute precedence
    const ruleResult = this.rulesFallback.classify(video, profile);
    if (
      ruleResult.reasonCode === 'EXPLICIT_BLOCKED_CHANNEL' ||
      ruleResult.reasonCode === 'EXPLICIT_BLOCKED_TOPIC' ||
      ruleResult.reasonCode === 'EXPLICIT_ALLOWED_CHANNEL' ||
      ruleResult.reasonCode === 'EXPLICIT_ALLOWED_TOPIC'
    ) {
      return ruleResult;
    }

    // 2. If semantic model is available, use vector cosine similarity
    if (this.isModelReady && this.pipeline) {
      try {
        return await this.classifyWithEmbedding(video, profile);
      } catch (err) {
        console.warn('[FocusFeed] Semantic inference failed, falling back to deterministic rules:', err);
      }
    }

    // 3. Fallback to deterministic rules engine
    return ruleResult;
  }

  private async classifyWithEmbedding(
    video: VideoMetadata,
    profile: InterestProfile
  ): Promise<ClassifierResult> {
    if (!this.pipeline) {
      return this.rulesFallback.classify(video, profile);
    }

    const videoText = `${video.title} ${video.channelName}`.trim();
    if (!videoText) {
      return {
        decision: 'blocked',
        confidence: 0.9,
        reasonCode: 'EMPTY_METADATA_FALLBACK'
      };
    }

    const videoVec = await this.pipeline.embed(videoText);

    let maxSim = -1;
    let matchedTopic = '';

    // Compare against active categories and subcategories
    for (const cat of profile.categories) {
      for (const sub of cat.subcategories) {
        const topicKey = `${cat.name}: ${sub.name} - ${sub.keywords.join(', ')}`;
        let topicVec = this.interestEmbeddingsCache.get(topicKey);

        if (!topicVec) {
          topicVec = await this.pipeline.embed(topicKey);
          this.interestEmbeddingsCache.set(topicKey, topicVec);
        }

        const sim = this.cosineSimilarity(videoVec, topicVec);
        if (sim > maxSim) {
          maxSim = sim;
          matchedTopic = `${cat.name} → ${sub.name}`;
        }
      }
    }

    const threshold = profile.minConfidenceThreshold ?? 0.65;
    const uncertainThreshold = Math.max(0.40, threshold - 0.20);

    if (maxSim >= threshold) {
      return {
        decision: 'allowed',
        matchedInterest: `${matchedTopic} (similarity: ${maxSim.toFixed(2)})`,
        confidence: maxSim,
        reasonCode: 'SEMANTIC_SIMILARITY_MATCH'
      };
    } else if (maxSim >= uncertainThreshold) {
      return {
        decision: 'uncertain',
        matchedInterest: `${matchedTopic} (similarity: ${maxSim.toFixed(2)})`,
        confidence: maxSim,
        reasonCode: 'SEMANTIC_UNCERTAIN_SCORE'
      };
    } else {
      return {
        decision: 'blocked',
        matchedInterest: undefined,
        confidence: 1.0 - maxSim,
        reasonCode: 'SEMANTIC_OUT_OF_INTEREST'
      };
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    const len = Math.min(a.length, b.length);

    for (let i = 0; i < len; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
