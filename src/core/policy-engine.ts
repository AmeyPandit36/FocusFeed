import type { Clock } from './clock';
import type { InterestProfile, PolicyDecision, VideoMetadata, UserCorrection } from './types';
import type { ClassifierInterface } from '../classifier/classifier.interface';

export interface PolicyEngineOptions {
  profile: InterestProfile;
  classifier: ClassifierInterface;
  clock: Clock;
  corrections?: Map<string, UserCorrection>;
}

export class PolicyEngine {
  private profile: InterestProfile;
  private classifier: ClassifierInterface;
  private clock: Clock;
  private corrections: Map<string, UserCorrection>;

  constructor(options: PolicyEngineOptions) {
    this.profile = options.profile;
    this.classifier = options.classifier;
    this.clock = options.clock;
    this.corrections = options.corrections ?? new Map();
  }

  setProfile(profile: InterestProfile): void {
    this.profile = profile;
  }

  setCorrections(corrections: Map<string, UserCorrection>): void {
    this.corrections = corrections;
  }

  async evaluate(video: VideoMetadata): Promise<PolicyDecision> {
    const timestamp = this.clock.now();

    // 1. Check for manual user correction
    if (this.corrections.has(video.id)) {
      const correction = this.corrections.get(video.id)!;
      return {
        decision: correction.correctedDecision,
        matchedRule: `manual_correction:${video.id}`,
        confidence: 1.0,
        reasonCode: 'USER_CORRECTION_OVERRIDE',
        classifierVersion: 'manual-override',
        timestamp
      };
    }

    // 2. Run classifier
    const res = await this.classifier.classify(video, this.profile);

    // 3. Handle uncertain decision according to configured policy
    let finalDecision = res.decision;
    let reasonCode = res.reasonCode;

    if (res.decision === 'uncertain') {
      const policy = this.profile.uncertainPolicy ?? 'review';
      if (policy === 'block' || policy === 'review') {
        // Safe default: hide uncertain content
        finalDecision = 'uncertain';
        reasonCode = `UNCERTAIN_${policy.toUpperCase()}`;
      } else {
        finalDecision = 'allowed';
        reasonCode = 'UNCERTAIN_ALLOWED_BY_POLICY';
      }
    }

    return {
      decision: finalDecision,
      matchedRule: res.matchedInterest,
      confidence: res.confidence,
      reasonCode,
      classifierVersion: this.classifier.version,
      timestamp
    };
  }
}
