import { query } from "./_generated/server";

/**
 * Health check query to verify Next.js <-> Convex connectivity.
 */
export const getHealth = query({
  args: {},
  handler: async () => {
    return {
      status: "healthy",
      service: "LendLoop Convex Backend",
      version: "0.1.0",
      timestamp: Date.now(),
    };
  },
});
