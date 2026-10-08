import { z } from "zod";
import { DATE_RE, isValidDate, isValidTimezone } from "./dates";

export const ENTRY_MAX = 2000;
export const BACKFILL_DAYS = 7;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "3–20 characters: letters, numbers, underscore.");

export const signupSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(8, "At least 8 characters.").max(72, "Max 72 characters."),
  timezone: z.string().transform((s) => (isValidTimezone(s) ? s : "UTC")),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export const entrySchema = z.object({
  content: z
    .string()
    .transform((s) => s.replace(/\r\n/g, "\n").trim())
    .pipe(z.string().min(1, "Write something first.").max(ENTRY_MAX, `Max ${ENTRY_MAX} characters.`)),
  entry_date: z.string().regex(DATE_RE, "Invalid date.").refine(isValidDate, "Invalid date."),
});

export const profileSchema = z.object({
  display_name: z.string().trim().max(40, "Max 40 characters.").transform((s) => s || null),
  bio: z.string().trim().max(160, "Max 160 characters.").transform((s) => s || null),
  timezone: z.string().refine(isValidTimezone, "Unknown timezone."),
});
