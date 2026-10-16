/**
 * Core type definitions for FocusFeed
 */

export type SurfaceType = 'home' | 'search' | 'related' | 'shorts' | 'channel' | 'direct_watch';

export type PolicyDecisionType = 'allowed' | 'blocked' | 'uncertain';

export type UncertainPolicyAction = 'review' | 'block' | 'allow';

export interface InterestSubcategory {
  id: string;
  name: string;
  keywords: string[];
}

export interface InterestCategory {
  id: string;
  name: string;
  description?: string;
  subcategories: InterestSubcategory[];
}

export interface CustomKeywords {
  allowed: string[];
  blocked: string[];
}

export interface InterestProfile {
  id: string;
  version: number;
  updatedAt: number;
  categories: InterestCategory[];
  allowedTopics: string[];
  blockedTopics: string[];
  allowedChannels: string[];
  blockedChannels: string[];
  customKeywords: CustomKeywords;
  minConfidenceThreshold: number; // e.g. 0.65
  uncertainPolicy: UncertainPolicyAction;
  onboardingCompleted: boolean;
}

export interface VideoMetadata {
  id: string;
  title: string;
  channelName: string;
  channelHandle?: string;
  surface: SurfaceType;
  url: string;
  thumbnailUrl?: string;
}

export interface PolicyDecision {
  decision: PolicyDecisionType;
  matchedRule?: string;
  confidence: number;
  reasonCode: string;
  classifierVersion: string;
  timestamp: number;
}

export interface CreditLedgerRecord {
  id: string;
  videoId: string;
  videoTitle: string;
  channelName?: string;
  surface: SurfaceType;
  timestamp: number;
  localDate: string; // "YYYY-MM-DD"
  decision: PolicyDecisionType;
  creditConsumed: boolean;
  reason: string;
}

export interface DailyCreditState {
  localDate: string; // "YYYY-MM-DD"
  allowance: number; // default 5
  consumed: number; // 0..5
  remaining: number; // max(0, allowance - consumed)
  attemptsToday: number;
  blockedUntil: number | null; // absolute unix timestamp (ms) or null
  isRestricted: boolean;
}

export interface EnforcementConfig {
  dailyAllowance: number; // default 5
  restrictionDurationMs: number; // default 10 hours = 36_000_000 ms
  uncertainPolicy: UncertainPolicyAction;
  enabled: boolean;
}

export interface UserCorrection {
  id: string;
  videoId: string;
  videoTitle: string;
  channelName?: string;
  originalDecision: PolicyDecisionType;
  correctedDecision: PolicyDecisionType;
  timestamp: number;
}
