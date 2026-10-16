import { z } from 'zod';
import { InterestProfileSchema } from '../core/interest-profile';

export const SurfaceTypeSchema = z.enum([
  'home',
  'search',
  'related',
  'shorts',
  'channel',
  'direct_watch'
]);

export const VideoMetadataSchema = z.object({
  id: z.string().min(1).max(100),
  title: z.string().max(500),
  channelName: z.string().max(200),
  channelHandle: z.string().max(200).optional(),
  surface: SurfaceTypeSchema,
  url: z.string().max(2000),
  thumbnailUrl: z.string().max(2000).optional()
});

export const EvaluateVideoRequestSchema = z.object({
  type: z.literal('EVALUATE_VIDEO'),
  payload: VideoMetadataSchema
});

export const RecordViewAttemptRequestSchema = z.object({
  type: z.literal('RECORD_VIEW_ATTEMPT'),
  payload: z.object({
    videoId: z.string().min(1).max(100),
    videoTitle: z.string().max(500),
    channelName: z.string().max(200).optional(),
    surface: SurfaceTypeSchema,
    decision: z.enum(['allowed', 'blocked', 'uncertain'])
  })
});

export const GetCurrentStateRequestSchema = z.object({
  type: z.literal('GET_CURRENT_STATE')
});

export const GetProfileRequestSchema = z.object({
  type: z.literal('GET_PROFILE')
});

export const SaveProfileRequestSchema = z.object({
  type: z.literal('SAVE_PROFILE'),
  payload: InterestProfileSchema
});

export const UpdateConfigRequestSchema = z.object({
  type: z.literal('UPDATE_CONFIG'),
  payload: z.object({
    dailyAllowance: z.number().int().min(1).max(100).optional(),
    restrictionDurationMs: z.number().int().min(60000).optional(),
    uncertainPolicy: z.enum(['review', 'block', 'allow']).optional(),
    enabled: z.boolean().optional()
  })
});

export const RecordCorrectionRequestSchema = z.object({
  type: z.literal('RECORD_CORRECTION'),
  payload: z.object({
    id: z.string(),
    videoId: z.string(),
    videoTitle: z.string(),
    channelName: z.string().optional(),
    originalDecision: z.enum(['allowed', 'blocked', 'uncertain']),
    correctedDecision: z.enum(['allowed', 'blocked', 'uncertain']),
    timestamp: z.number()
  })
});

export const GetStatsRequestSchema = z.object({
  type: z.literal('GET_STATS')
});

export const ClearDataRequestSchema = z.object({
  type: z.literal('CLEAR_ALL_DATA')
});

export const ExtensionMessageSchema = z.discriminatedUnion('type', [
  EvaluateVideoRequestSchema,
  RecordViewAttemptRequestSchema,
  GetCurrentStateRequestSchema,
  GetProfileRequestSchema,
  SaveProfileRequestSchema,
  UpdateConfigRequestSchema,
  RecordCorrectionRequestSchema,
  GetStatsRequestSchema,
  ClearDataRequestSchema
]);

export type ExtensionMessage = z.infer<typeof ExtensionMessageSchema>;
