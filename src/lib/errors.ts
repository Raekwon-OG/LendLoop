/**
 * Utility functions for user-friendly error formatting across Convex mutations and client interactions.
 */

/**
 * Sanitizes and extracts human-readable error messages from Convex mutations, queries, and JavaScript errors.
 * Removes internal Convex runtime prefixes, request IDs, and stack traces:
 * e.g., "[CONVEX M(borrowRequests:create)] [Request ID: ...] Server Error Uncaught Error: You cannot borrow your own equipment listing. at handler (../convex/borrowRequests.ts:51:13) Called by client"
 * -> "You cannot borrow your own equipment listing."
 *
 * @param err The caught error object, string, or unknown value.
 * @param fallback Optional fallback message when no legible message can be extracted.
 * @returns Clean, user-facing error string.
 */
export function formatConvexError(
  err: unknown,
  fallback = "An unexpected error occurred. Please try again."
): string {
  if (!err) {
    return fallback;
  }

  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : String(err);

  if (!raw || raw.trim().length === 0) {
    return fallback;
  }

  // 1. Match "Uncaught Error: <message>" before stack trace or "at handler" or "Called by client"
  const uncaughtMatch = raw.match(
    /Uncaught Error:\s*([^\n]+?)(?:\s+at\s+handler|\s+at\s+[a-zA-Z0-9_\-./()]|\s+Called by client|$)/i
  );
  if (uncaughtMatch && uncaughtMatch[1]) {
    const candidate = uncaughtMatch[1].trim();
    if (candidate.length > 0) return candidate;
  }

  // 2. Match standard "Error: <message>"
  const standardMatch = raw.match(
    /(?:^|\s)Error:\s*([^\n]+?)(?:\s+at\s+handler|\s+at\s+[a-zA-Z0-9_\-./()]|\s+Called by client|$)/i
  );
  if (standardMatch && standardMatch[1]) {
    const candidate = standardMatch[1].trim();
    if (candidate.length > 0) return candidate;
  }

  // 3. Fallback: strip leading CONVEX / Server Error brackets and trailing stack references
  const cleaned = raw
    .replace(/^\[CONVEX[^\]]*\]\s*/i, "")
    .replace(/^\[Request ID:[^\]]*\]\s*/i, "")
    .replace(/^Server Error\s*/i, "")
    .replace(/\s+at\s+handler.*$/i, "")
    .replace(/\s+Called by client.*$/i, "")
    .trim();

  return cleaned.length > 0 ? cleaned : fallback;
}

