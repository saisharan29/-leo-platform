import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(72),
  displayName: z.string().min(1).max(24).trim(),
});

export const answerSchema = z.object({
  qType: z.enum(["mcq", "fill", "match", "order", "listen", "type", "speak"]),
  skill: z.enum(["speaking", "listening", "reading", "writing", "vocab", "grammar"]),
  correct: z.boolean(),
});

export const lessonCompleteSchema = z.object({
  lessonNumber: z.number().int().min(1).max(84),
  accuracy: z.number().int().min(0).max(100),
  answers: z.array(answerSchema).min(1).max(200),
});

export const profilePatchSchema = z.object({
  displayName: z.string().min(1).max(24).trim().optional(),
  avatar: z.string().max(8).optional(),
  dailyGoalXp: z.number().int().min(10).max(500).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  leaderboardOptIn: z.boolean().optional(),
});
