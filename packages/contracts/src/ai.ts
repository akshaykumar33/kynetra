import { z } from 'zod';

export const AiChatRequestSchema = z.object({
  message: z.string(),
  userHandle: z.string().default('developer'),
  currentDistrictId: z.string().optional(),
  currentFloorNumber: z.number().optional(),
  currentNodeId: z.string().optional(),
  contextTopic: z.enum(['general', 'sre_incident', 'architecture', 'onboarding']).default('general'),
});
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

export const AiChatResponseSchema = z.object({
  reply: z.string(),
  sender: z.string().default('Aria (AI Concierge)'),
  suggestedActions: z.array(z.string()).default([]),
  relevantDocs: z.array(z.string()).default([]),
  timestamp: z.string(),
});
export type AiChatResponse = z.infer<typeof AiChatResponseSchema>;
