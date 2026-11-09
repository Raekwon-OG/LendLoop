import { z } from "zod";

/**
 * Client-accessible environment variables schema.
 * Must begin with NEXT_PUBLIC_.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/dashboard"),
  NEXT_PUBLIC_CONVEX_URL: z.string().url("NEXT_PUBLIC_CONVEX_URL must be a valid URL"),
});

/**
 * Server-only environment variables schema.
 * Secrets must never be exposed to the browser.
 */
const serverEnvSchema = z.object({
  CLERK_SECRET_KEY: z.string().min(1, "Missing CLERK_SECRET_KEY"),
  CLERK_WEBHOOK_SECRET: z.string().optional(),
  INITIAL_ADMIN_EMAIL: z.string().email().optional(),
  CONVEX_DEPLOYMENT: z.string().optional(),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Validates and retrieves client-safe environment variables.
 * Safe to call in both client and server contexts.
 */
export function getClientEnv(): ClientEnv {
  const parsed = clientEnvSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.warn(
      `[LendLoop env warning] Client environment variables are incomplete:\n${errorDetails}\nProvide these in your .env.local file.`
    );
  }

  return (
    parsed.data ?? {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in",
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL ?? "/sign-up",
      NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL ?? "/dashboard",
      NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:
        process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL ?? "/dashboard",
      NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
    }
  );
}

/**
 * Validates and retrieves server-only environment variables.
 * Calling this on the client will log a warning or throw.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() must only be called on the server to prevent secret leakage.");
  }

  const parsed = serverEnvSchema.safeParse({
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
    INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL,
    CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
  });

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.warn(
      `[LendLoop env warning] Server environment variables are incomplete:\n${errorDetails}\nProvide these in your .env.local file.`
    );
  }

  return (
    parsed.data ?? {
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
      CONVEX_DEPLOYMENT: process.env.CONVEX_DEPLOYMENT,
    }
  );
}
