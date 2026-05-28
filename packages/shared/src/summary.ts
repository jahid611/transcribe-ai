import { z } from 'zod';

export const SummarySchema = z.object({
  title: z.string().max(120),
  tldr: z.string().max(400),
  key_points: z.array(z.string()).min(1).max(10),
  decisions: z
    .array(
      z.object({
        decision: z.string(),
        owner: z.string().nullable().optional(),
      }),
    )
    .default([]),
  actions: z
    .array(
      z.object({
        action: z.string(),
        owner: z.string().nullable().optional(),
        due: z.string().nullable().optional(),
      }),
    )
    .default([]),
  participants: z.array(z.string()).default([]),
  topics: z.array(z.string()).min(0).max(8).default([]),
});

export type Summary = z.infer<typeof SummarySchema>;
