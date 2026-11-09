import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * LendLoop Convex Schema Definition
 *
 * Establishes the foundational schema for health monitoring and provides
 * typed definitions for the neighborhood tool-lending application.
 * Full business tables (users, tools, borrowRequests, loans, automationEvents)
 * are populated and indexed incrementally starting in Phase 1.
 */
export default defineSchema({
  healthCheck: defineTable({
    service: v.string(),
    status: v.string(),
    timestamp: v.number(),
  }),
});
