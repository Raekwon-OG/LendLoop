import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Public query: Fetches community equipment currently marked as 'available'.
 *
 * Privacy & Security:
 * - Only returns public-safe summary fields (id, title, description, category, condition, status).
 * - Does not expose owner contact details or private loan histories to unauthenticated callers.
 */
export const getAvailable = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let toolsQuery = ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "available"));

    if (args.category && args.category !== "All") {
      toolsQuery = ctx.db
        .query("tools")
        .withIndex("by_status_and_category", (q) =>
          q.eq("status", "available").eq("category", args.category!)
        );
    }

    const availableTools = await toolsQuery.collect();

    // Map to public-safe projection
    return availableTools.map((tool) => ({
      _id: tool._id,
      title: tool.title,
      description: tool.description,
      category: tool.category,
      condition: tool.condition,
      status: tool.status,
      isAvailable: tool.status === "available",
      createdAt: tool.createdAt,
    }));
  },
});

/**
 * Public query: Returns unique categories and counts of available equipment.
 */
export const getAvailableCategories = query({
  args: {},
  handler: async (ctx) => {
    const availableTools = await ctx.db
      .query("tools")
      .withIndex("by_status", (q) => q.eq("status", "available"))
      .collect();

    const counts: Record<string, number> = {};

    for (const tool of availableTools) {
      counts[tool.category] = (counts[tool.category] ?? 0) + 1;
    }

    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
    }));
  },
});
