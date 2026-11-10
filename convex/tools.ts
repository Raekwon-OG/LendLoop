import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  assertToolOwnerOrAdmin,
  requireAdmin,
  requireAuthenticatedUser,
  requireCurrentUserRecord,
} from "./lib/auth";

/**
 * Safely resolves a Convex storage ID into a public CDN URL.
 * Gracefully returns null in unit test mocks where ctx.storage may be omitted.
 */
async function resolveImageUrl(
  ctx: { storage?: { getUrl: (storageId: Id<"_storage">) => Promise<string | null> } },
  imageStorageId?: Id<"_storage">
): Promise<string | null> {
  if (!imageStorageId || !ctx.storage) {
    return null;
  }
  try {
    return await ctx.storage.getUrl(imageStorageId);
  } catch {
    return null;
  }
}

/**
 * Public query: Fetches community equipment currently marked as 'available'.
 *
 * Privacy & Security:
 * - Only returns public-safe summary fields (id, title, description, category, condition, status, imageUrl).
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
    return await Promise.all(
      availableTools.map(async (tool) => ({
        _id: tool._id,
        title: tool.title,
        description: tool.description,
        category: tool.category,
        condition: tool.condition,
        status: tool.status,
        isAvailable: tool.status === "available",
        imageUrl: await resolveImageUrl(ctx, tool.imageStorageId),
        createdAt: tool.createdAt,
      }))
    );
  },
});

/**
 * Authenticated query: Fetches all active (non-archived) community tools with availability status,
 * filterable by category, along with lender trust badge info and resolved photo URL.
 */
export const listCatalog = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthenticatedUser(ctx);

    let toolsList: Doc<"tools">[];
    if (args.category && args.category !== "All") {
      toolsList = await ctx.db
        .query("tools")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .collect();
    } else {
      toolsList = await ctx.db.query("tools").collect();
    }

    const activeTools = toolsList.filter((tool) => tool.status !== "archived");

    const enriched = await Promise.all(
      activeTools.map(async (tool) => {
        const owner = ctx.db.get
          ? ((await ctx.db.get(tool.ownerId)) as Doc<"users"> | null)
          : null;
        const imageUrl = await resolveImageUrl(ctx, tool.imageStorageId);

        return {
          _id: tool._id,
          title: tool.title,
          description: tool.description,
          category: tool.category,
          condition: tool.condition,
          status: tool.status,
          isAvailable: tool.status === "available",
          imageUrl,
          ownerId: tool.ownerId,
          ownerName: owner?.name ?? "Community Neighbor",
          isOwnerTrusted: owner?.isTrustedLender ?? false,
          createdAt: tool.createdAt,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
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

    return await Promise.all(
      userTools.map(async (tool) => ({
        ...tool,
        imageUrl: await resolveImageUrl(ctx, tool.imageStorageId),
      }))
    );
  },
});

/**
 * Authenticated mutation: Generates a short-lived upload URL for Convex File Storage
 * so users can attach equipment photos to their listings.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
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

    return {
      ...tool,
      imageUrl: await resolveImageUrl(ctx, tool.imageStorageId),
    };
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
    imageStorageId: v.optional(v.id("_storage")),
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
      ...(args.imageStorageId ? { imageStorageId: args.imageStorageId } : {}),
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
    imageStorageId: v.optional(v.id("_storage")),
    removeImage: v.optional(v.boolean()),
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

    if (args.imageStorageId !== undefined) {
      updates.imageStorageId = args.imageStorageId;
    } else if (args.removeImage === true) {
      updates.imageStorageId = undefined;
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

/**
 * Admin query: Returns all equipment listings in the system along with owner details.
 * Strictly restricted to users with the 'admin' role.
 */
export const adminListAllTools = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allTools = await ctx.db.query("tools").collect();

    const enriched = await Promise.all(
      allTools.map(async (tool) => {
        const owner = (await ctx.db.get(tool.ownerId)) as Doc<"users"> | null;
        return {
          ...tool,
          imageUrl: await resolveImageUrl(ctx, tool.imageStorageId),
          ownerName: owner?.name ?? "Unknown Neighbor",
          ownerEmail: owner?.email ?? "",
          isOwnerTrusted: owner?.isTrustedLender ?? false,
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Admin mutation: Moderates and permanently removes an equipment listing.
 * Strictly restricted to users with the 'admin' role.
 */
export const adminRemoveTool = mutation({
  args: {
    toolId: v.id("tools"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireAdmin(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Tool listing not found.");
    }

    // Delete the listing
    await ctx.db.delete(args.toolId);

    // Queue moderation event for n8n/audit
    const now = Date.now();
    await ctx.db.insert("automationEvents", {
      eventType: "request_status_changed",
      resourceId: args.toolId,
      payload: JSON.stringify({
        action: "admin_listing_removed",
        toolId: args.toolId,
        toolTitle: tool.title,
        ownerId: tool.ownerId,
        moderatorId: userRecord._id,
        moderatorEmail: userRecord.email,
        reason: args.reason ?? "Administrative moderation",
        removedAt: now,
      }),
      status: "processed",
      idempotencyKey: `admin_remove_${args.toolId}_${now}`,
      attempts: 1,
      createdAt: now,
    });

    return {
      success: true,
      deletedToolId: args.toolId,
      toolTitle: tool.title,
    };
  },
});
