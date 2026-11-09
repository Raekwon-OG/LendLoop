import { GenericId, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin, requireAuthenticatedUser, getUserByClerkId } from "./lib/auth";

/**
 * Synchronizes the currently authenticated Clerk user with the Convex database.
 *
 * Safe & Idempotent:
 * - If user exists: updates name and email if they have changed.
 * - If user is new: provisions user record with default 'user' role (or 'admin' if first user or configured).
 */
export const syncUser = mutation({
  args: {
    preferredName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);
    const clerkId = identity.clerkId;
    const email = identity.email ?? "";
    const name = args.preferredName ?? identity.name ?? email.split("@")[0] ?? "Neighbor";

    const existingUser = await getUserByClerkId(ctx, clerkId);

    if (existingUser) {
      // Update name/email if modified
      const updates: { name?: string; email?: string } = {};
      if (existingUser.name !== name && name !== "") {
        updates.name = name;
      }
      if (existingUser.email !== email && email !== "") {
        updates.email = email;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existingUser._id as GenericId<"users">, updates);
      }

      return {
        ...existingUser,
        ...updates,
      };
    }

    // Determine initial role:
    // 1. Check if first user in database (auto-bootstraps initial admin for local/demo setup)
    // 2. Check if email matches configured INITIAL_ADMIN_EMAIL
    // 3. Defaults to 'user'
    const totalUsers = await ctx.db.query("users").take(1);
    const isFirstUser = totalUsers.length === 0;
    const configuredAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
    const isConfiguredAdmin =
      Boolean(configuredAdminEmail) && email.toLowerCase() === configuredAdminEmail;

    const role: "user" | "admin" = isFirstUser || isConfiguredAdmin ? "admin" : "user";

    const newUserId = await ctx.db.insert("users", {
      clerkId,
      name,
      email,
      role,
      isTrustedLender: role === "admin", // Admins start with trusted status
      createdAt: Date.now(),
    });

    return {
      _id: newUserId,
      clerkId,
      name,
      email,
      role,
      isTrustedLender: role === "admin",
      createdAt: Date.now(),
    };
  },
});

/**
 * Retrieves the current authenticated user's profile from Convex.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await getUserByClerkId(ctx, identity.subject);
  },
});

/**
 * Retrieves a user's public profile by database ID.
 */
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Updates the current authenticated user's display name.
 */
export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await requireAuthenticatedUser(ctx);
    const user = await getUserByClerkId(ctx, identity.clerkId);

    if (!user) {
      throw new Error("User record not found in database.");
    }

    const trimmedName = args.name.trim();
    if (trimmedName.length === 0) {
      throw new Error("Name cannot be empty.");
    }

    await ctx.db.patch(user._id as GenericId<"users">, {
      name: trimmedName,
    });

    return {
      ...user,
      name: trimmedName,
    };
  },
});

/**
 * Admin-only: Updates another user's role (promote/demote admin).
 */
export const setRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: v.union(v.literal("user"), v.literal("admin")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found.");
    }

    await ctx.db.patch(args.targetUserId, {
      role: args.newRole,
    });

    return {
      success: true,
      userId: args.targetUserId,
      role: args.newRole,
    };
  },
});

/**
 * Admin-only: Designates or removes Trusted Lender status.
 */
export const setTrustedLender = mutation({
  args: {
    targetUserId: v.id("users"),
    isTrustedLender: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("Target user not found.");
    }

    await ctx.db.patch(args.targetUserId, {
      isTrustedLender: args.isTrustedLender,
    });

    return {
      success: true,
      userId: args.targetUserId,
      isTrustedLender: args.isTrustedLender,
    };
  },
});

/**
 * Admin-only: Lists all registered community members.
 */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return await ctx.db.query("users").collect();
  },
});
