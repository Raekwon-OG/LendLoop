import { describe, expect, it } from "vitest";
import type { MutationCtx, QueryCtx } from "../convex/_generated/server";
import type { Id } from "../convex/_generated/dataModel";
import type { UserRecord } from "../convex/lib/auth";

interface MutationCallable<TArgs, TResult> {
  _handler: (ctx: MutationCtx, args: TArgs) => Promise<TResult>;
}

interface QueryCallable<TArgs, TResult> {
  _handler: (ctx: QueryCtx, args: TArgs) => Promise<TResult>;
}

describe("Phase 4: Tool Listings CRUD & Ownership Enforcement", () => {
  const mockOwner: UserRecord = {
    _id: "user_owner_1" as unknown as Id<"users">,
    _creationTime: 1700000000000,
    clerkId: "clerk_owner_1",
    name: "Alice Owner",
    email: "alice@example.com",
    role: "user",
    isTrustedLender: true,
    createdAt: 1700000000000,
  };

  const mockNonOwner: UserRecord = {
    _id: "user_intruder_2" as unknown as Id<"users">,
    _creationTime: 1700000000000,
    clerkId: "clerk_intruder_2",
    name: "Bob Intruder",
    email: "bob@example.com",
    role: "user",
    isTrustedLender: false,
    createdAt: 1700000000000,
  };

  const mockAdmin: UserRecord = {
    _id: "user_admin_99" as unknown as Id<"users">,
    _creationTime: 1700000000000,
    clerkId: "clerk_admin_99",
    name: "Charlie Admin",
    email: "admin@lendloop.org",
    role: "admin",
    isTrustedLender: true,
    createdAt: 1700000000000,
  };

  const mockTool = {
    _id: "tool_123",
    ownerId: "user_owner_1",
    ownerClerkId: "clerk_owner_1",
    title: "Makita Circular Saw 7-1/4\"",
    description: "Laser guide, 15 Amp motor with carbide blade.",
    category: "Power Tools",
    condition: "Good" as const,
    status: "available" as const,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  describe("Creating Tool Listings", () => {
    it("should successfully create a listing and assign ownership to caller", async () => {
      let insertedTool: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: "https://clerk.accounts.dev|clerk_owner_1",
            subject: "clerk_owner_1",
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockOwner,
            }),
          }),
          insert: async (_table: string, doc: Record<string, unknown>) => {
            insertedTool = doc;
            return "tool_new_1";
          },
        },
      } as unknown as MutationCtx;

      const { create } = await import("../convex/tools");
      const callable = create as unknown as MutationCallable<
        { title: string; description: string; category: string; condition: "Like New" | "Good" | "Fair" },
        string
      >;

      const toolId = await callable._handler(mockCtx, {
        title: "  Bosch Rotary Hammer  ",
        description: "Heavy duty SDS-plus rotary hammer.",
        category: "Power Tools",
        condition: "Like New",
      });

      expect(toolId).toBe("tool_new_1");
      expect(insertedTool).not.toBeNull();
      expect(insertedTool?.["ownerId"]).toBe("user_owner_1");
      expect(insertedTool?.["ownerClerkId"]).toBe("clerk_owner_1");
      expect(insertedTool?.["title"]).toBe("Bosch Rotary Hammer"); // Trimmed
      expect(insertedTool?.["status"]).toBe("available");
    });

    it("should reject creation with empty title or description", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_owner_1",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockOwner,
            }),
          }),
        },
      } as unknown as MutationCtx;

      const { create } = await import("../convex/tools");
      const callable = create as unknown as MutationCallable<
        { title: string; description: string; category: string; condition: "Like New" | "Good" | "Fair" },
        string
      >;

      await expect(
        callable._handler(mockCtx, {
          title: "   ",
          description: "A tool",
          category: "Power Tools",
          condition: "Good",
        })
      ).rejects.toThrow("Tool title cannot be empty.");

      await expect(
        callable._handler(mockCtx, {
          title: "Valid Title",
          description: "   ",
          category: "Power Tools",
          condition: "Good",
        })
      ).rejects.toThrow("Tool description cannot be empty.");
    });
  });

  describe("Updating Tool Listings & Ownership", () => {
    it("should allow owner to update tool details", async () => {
      let patched: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_owner_1",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockOwner,
            }),
          }),
          get: async () => mockTool,
          patch: async (_id: string, patch: Record<string, unknown>) => {
            patched = patch;
          },
        },
      } as unknown as MutationCtx;

      const { update } = await import("../convex/tools");
      const callable = update as unknown as MutationCallable<
        { toolId: string; title?: string; status?: "available" | "maintenance" | "archived" },
        unknown
      >;

      await callable._handler(mockCtx, {
        toolId: "tool_123",
        title: "Updated Saw Title",
        status: "maintenance",
      });

      expect(patched).not.toBeNull();
      expect(patched?.["title"]).toBe("Updated Saw Title");
      expect(patched?.["status"]).toBe("maintenance");
    });

    it("should allow admin to update any tool", async () => {
      let patched: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_admin_99",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockAdmin,
            }),
          }),
          get: async () => mockTool,
          patch: async (_id: string, patch: Record<string, unknown>) => {
            patched = patch;
          },
        },
      } as unknown as MutationCtx;

      const { update } = await import("../convex/tools");
      const callable = update as unknown as MutationCallable<
        { toolId: string; status?: "available" | "maintenance" | "archived" },
        unknown
      >;

      await callable._handler(mockCtx, {
        toolId: "tool_123",
        status: "archived",
      });

      expect(patched?.["status"]).toBe("archived");
    });

    it("should forbid non-owner regular user from updating another user's tool", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_intruder_2",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockNonOwner,
            }),
          }),
          get: async () => mockTool,
        },
      } as unknown as MutationCtx;

      const { update } = await import("../convex/tools");
      const callable = update as unknown as MutationCallable<
        { toolId: string; title?: string },
        unknown
      >;

      await expect(
        callable._handler(mockCtx, {
          toolId: "tool_123",
          title: "Hacked Title",
        })
      ).rejects.toThrow("Forbidden: You are not authorized to modify this tool listing.");
    });
  });

  describe("Deleting Tool Listings", () => {
    it("should allow owner to delete tool", async () => {
      let deletedId: string | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_owner_1",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockOwner,
            }),
          }),
          get: async () => mockTool,
          delete: async (id: string) => {
            deletedId = id;
          },
        },
      } as unknown as MutationCtx;

      const { remove } = await import("../convex/tools");
      const callable = remove as unknown as MutationCallable<
        { toolId: string },
        { success: boolean; deletedToolId: string }
      >;

      const result = await callable._handler(mockCtx, { toolId: "tool_123" });

      expect(deletedId).toBe("tool_123");
      expect(result.success).toBe(true);
    });

    it("should forbid non-owner from deleting tool", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_intruder_2",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockNonOwner,
            }),
          }),
          get: async () => mockTool,
        },
      } as unknown as MutationCtx;

      const { remove } = await import("../convex/tools");
      const callable = remove as unknown as MutationCallable<
        { toolId: string },
        { success: boolean }
      >;

      await expect(callable._handler(mockCtx, { toolId: "tool_123" })).rejects.toThrow(
        "Forbidden: You are not authorized to modify this tool listing."
      );
    });
  });

  describe("Querying My Tools", () => {
    it("should return listings belonging to the caller", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: "https://clerk.accounts.dev|clerk_owner_1",
            subject: "clerk_owner_1",
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (
              _name: string,
              qBuilder: (q: { eq: (field: string, val: string) => unknown }) => unknown
            ) => {
              let filterId = "";
              const q = {
                eq: (_field: string, val: string) => {
                  filterId = val;
                  return q;
                },
              };
              qBuilder(q);
              return {
                collect: async () => [mockTool].filter((t) => t.ownerClerkId === filterId),
              };
            },
          }),
        },
      } as unknown as QueryCtx;

      const { getMyTools } = await import("../convex/tools");
      const callable = getMyTools as unknown as QueryCallable<
        Record<string, never>,
        Array<typeof mockTool>
      >;

      const tools = await callable._handler(mockCtx, {});
      expect(tools).toHaveLength(1);
      expect(tools[0]?._id).toBe("tool_123");
      expect(tools[0]?.ownerClerkId).toBe("clerk_owner_1");
    });
  });
});
