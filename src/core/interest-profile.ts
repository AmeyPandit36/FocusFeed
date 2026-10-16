import { z } from 'zod';
import type { InterestCategory, InterestProfile, UncertainPolicyAction, InterestSubcategory } from './types';

export type { InterestCategory, InterestProfile, UncertainPolicyAction, InterestSubcategory };

export const InterestSubcategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  keywords: z.array(z.string().min(1))
});

export const InterestCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  subcategories: z.array(InterestSubcategorySchema)
});

export const CustomKeywordsSchema = z.object({
  allowed: z.array(z.string()),
  blocked: z.array(z.string())
});

export const InterestProfileSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  updatedAt: z.number(),
  categories: z.array(InterestCategorySchema),
  allowedTopics: z.array(z.string()),
  blockedTopics: z.array(z.string()),
  allowedChannels: z.array(z.string()),
  blockedChannels: z.array(z.string()),
  customKeywords: CustomKeywordsSchema,
  minConfidenceThreshold: z.number().min(0).max(1).default(0.65),
  uncertainPolicy: z.enum(['review', 'block', 'allow']).default('review'),
  onboardingCompleted: z.boolean().default(false)
});

export const CURATED_INTEREST_TEMPLATES: InterestCategory[] = [
  {
    id: 'programming',
    name: 'Programming & Software Engineering',
    description: 'Software development, coding tutorials, architecture, and languages',
    subcategories: [
      {
        id: 'prog-python',
        name: 'Python',
        keywords: ['python', 'django', 'fastapi', 'flask', 'pandas', 'numpy', 'pytest']
      },
      {
        id: 'prog-web',
        name: 'Web Development',
        keywords: ['react', 'next.js', 'vue', 'typescript', 'javascript', 'css', 'html', 'node.js', 'tailwind']
      },
      {
        id: 'prog-systems',
        name: 'Systems & DevOps',
        keywords: ['rust', 'c++', 'golang', 'linux', 'docker', 'kubernetes', 'cloud', 'aws', 'backend']
      }
    ]
  },
  {
    id: 'datascience-ai',
    name: 'Data Science & Artificial Intelligence',
    description: 'Machine learning, neural networks, LLMs, and data analytics',
    subcategories: [
      {
        id: 'ai-ml',
        name: 'Machine Learning & Deep Learning',
        keywords: ['machine learning', 'deep learning', 'neural networks', 'pytorch', 'tensorflow', 'scikit-learn']
      },
      {
        id: 'ai-llm',
        name: 'Generative AI & LLMs',
        keywords: ['llm', 'gpt', 'transformer', 'rag', 'langchain', 'ai agents', 'prompt engineering']
      }
    ]
  },
  {
    id: 'science-tech',
    name: 'Science & Technology',
    description: 'STEM topics, physics, astronomy, engineering, and hardware',
    subcategories: [
      {
        id: 'tech-hardware',
        name: 'Hardware & Computing',
        keywords: ['semiconductors', 'cpu', 'gpu', 'microcontroller', 'raspberry pi', 'embedded', 'electronics']
      },
      {
        id: 'sci-physics',
        name: 'Physics & Mathematics',
        keywords: ['quantum mechanics', 'astrophysics', 'relativity', 'calculus', 'linear algebra', 'space exploration']
      }
    ]
  },
  {
    id: 'design-creativity',
    name: 'Design & UX',
    description: 'Product design, UI/UX, typography, and motion design',
    subcategories: [
      {
        id: 'des-uiux',
        name: 'UI/UX Design',
        keywords: ['figma', 'user experience', 'interaction design', 'design systems', 'wireframing']
      }
    ]
  },
  {
    id: 'productivity',
    name: 'Deep Work & Productivity',
    description: 'Evidence-based focus, study habits, and personal effectiveness',
    subcategories: [
      {
        id: 'prod-focus',
        name: 'Focus & Learning',
        keywords: ['deep work', 'study technique', 'cognitive science', 'learning systems', 'note taking']
      }
    ]
  }
];

export function createDefaultProfile(): InterestProfile {
  return {
    id: 'default',
    version: 1,
    updatedAt: Date.now(),
    categories: [
      CURATED_INTEREST_TEMPLATES[0], // Programming
      CURATED_INTEREST_TEMPLATES[1]  // AI & Data Science
    ],
    allowedTopics: ['TypeScript', 'Python', 'Machine Learning', 'Computer Science'],
    blockedTopics: ['Celebrity Gossip', 'Reality TV', 'Horoscopes', 'Sensational Drama'],
    allowedChannels: [],
    blockedChannels: [],
    customKeywords: {
      allowed: ['tutorial', 'deep dive', 'architecture', 'course', 'explained'],
      blocked: ['prank', 'shocking', 'reacting to', 'drama', 'exposed']
    },
    minConfidenceThreshold: 0.65,
    uncertainPolicy: 'review',
    onboardingCompleted: false
  };
}

export function validateProfile(data: unknown): InterestProfile {
  return InterestProfileSchema.parse(data);
}

export function exportProfileToJson(profile: InterestProfile): string {
  return JSON.stringify(profile, null, 2);
}

export function importProfileFromJson(jsonStr: string): { success: boolean; profile?: InterestProfile; error?: string } {
  try {
    const parsed = JSON.parse(jsonStr);
    const validated = validateProfile(parsed);
    // increment version on import to trigger cache invalidation
    validated.version += 1;
    validated.updatedAt = Date.now();
    return { success: true, profile: validated };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON format or schema';
    return { success: false, error: message };
  }
}
