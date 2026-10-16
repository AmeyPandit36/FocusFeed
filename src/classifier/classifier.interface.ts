import type { InterestProfile, VideoMetadata } from '../core/types';

export interface ClassifierResult {
  decision: 'allowed' | 'blocked' | 'uncertain';
  matchedInterest?: string;
  confidence: number;
  reasonCode: string;
}

export interface ClassifierInterface {
  readonly version: string;
  readonly name: string;
  
  classify(
    video: VideoMetadata,
    profile: InterestProfile
  ): Promise<ClassifierResult> | ClassifierResult;
}
