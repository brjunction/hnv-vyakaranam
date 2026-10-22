import "server-only";
import { z } from "zod";

// Environment variables, validated once. See docs/01-architecture.md §5.
//
// DATABASE_URL and AUTH_SECRET are optional *during the transition*: when
// they are missing, public pages render without database content (daily
// widgets hide) and /admin shows a "not configured" message, instead of the
// whole site failing. Once every environment has them, make them required.
const schema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres:// URL")
    .optional(),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters").optional(),
  CRON_SECRET: z.string().min(16).optional(),
  VERCEL_DEPLOY_HOOK_URL: z.string().url().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Fail loudly with the exact problem rather than a mysterious runtime error.
  throw new Error(`Invalid environment variables:\n${z.prettifyError(parsed.error)}`);
}

export const env = parsed.data;
export const isDbConfigured = Boolean(env.DATABASE_URL);
export const isAuthConfigured = Boolean(env.AUTH_SECRET);
