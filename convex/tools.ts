import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  assertToolOwnerOrAdmin,
  requireAuthenticatedUser,
  requireCurrentUserRecord,
} from "./lib/auth";

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

/**
 * Authenticated query: Returns all tools listed by the calling user.
 */
export const getMyTools = query({
  args: {},
  handler: async (ctx) => {
    const authUser = await requireAuthenticatedUser(ctx);

    const userTools = await ctx.db
      .query("tools")
      .withIndex("by_owner_clerk_id", (q) => q.eq("ownerClerkId", authUser.clerkId))
      .collect();

    return userTools;
  },
});

/**
 * Query: Returns a single tool by ID.
 */
export const getToolById = query({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      return null;
    }

    return tool;
  },
});

/**
 * Authenticated mutation: Creates a new equipment listing.
 */
export const create = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    category: v.string(),
    condition: v.union(v.literal("Like New"), v.literal("Good"), v.literal("Fair")),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const trimmedTitle = args.title.trim();
    const trimmedDescription = args.description.trim();

    if (trimmedTitle.length === 0) {
      throw new Error("Tool title cannot be empty.");
    }

    if (trimmedDescription.length === 0) {
      throw new Error("Tool description cannot be empty.");
    }

    const now = Date.now();
    const toolId = await ctx.db.insert("tools", {
      ownerId: userRecord._id,
      ownerClerkId: userRecord.clerkId,
      title: trimmedTitle,
      description: trimmedDescription,
      category: args.category,
      condition: args.condition,
      status: "available",
      createdAt: now,
      updatedAt: now,
    });

    return toolId;
  },
});

/**
 * Authenticated mutation: Updates an existing equipment listing.
 * Strict ownership check: only the tool owner or an admin may modify the tool.
 */
export const update = mutation({
  args: {
    toolId: v.id("tools"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    condition: v.optional(v.union(v.literal("Like New"), v.literal("Good"), v.literal("Fair"))),
    status: v.optional(
      v.union(
        v.literal("available"),
        v.literal("borrowed"),
        v.literal("maintenance"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Tool listing not found.");
    }

    // Enforce ownership or admin privilege
    assertToolOwnerOrAdmin(userRecord, tool);

    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) {
      const trimmed = args.title.trim();
      if (trimmed.length === 0) throw new Error("Tool title cannot be empty.");
      updates.title = trimmed;
    }

    if (args.description !== undefined) {
      const trimmed = args.description.trim();
      if (trimmed.length === 0) throw new Error("Tool description cannot be empty.");
      updates.description = trimmed;
    }

    if (args.category !== undefined) {
      updates.category = args.category;
    }

    if (args.condition !== undefined) {
      updates.condition = args.condition;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    await ctx.db.patch(args.toolId, updates);

    return {
      ...tool,
      ...updates,
    };
  },
});

/**
 * Authenticated mutation: Removes or archives a tool listing.
 * Strict ownership check: only the tool owner or an admin may remove the tool.
 */
export const remove = mutation({
  args: {
    toolId: v.id("tools"),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Tool listing not found.");
    }

    // Enforce ownership or admin privilege
    assertToolOwnerOrAdmin(userRecord, tool);

    // Delete the listing
    await ctx.db.delete(args.toolId);

    return {
      success: true,
      deletedToolId: args.toolId,
    };
  },
});
