import { describe, expect, it } from "vitest";
import type { MutationCtx, QueryCtx } from "../convex/_generated/server";
import type { Id } from "../convex/_generated/dataModel";
import type { UserRecord } from "../convex/lib/auth";
import * as tools from "../convex/tools";
import * as users from "../convex/users";
import * as loans from "../convex/loans";

interface MutationCallable<TArgs, TResult> {
  _handler: (ctx: MutationCtx, args: TArgs) => Promise<TResult>;
}

interface QueryCallable<TArgs, TResult> {
  _handler: (ctx: QueryCtx, args: TArgs) => Promise<TResult>;
}

describe("Phase 6: Admin and Role-Based Access Control (RBAC)", () => {
  const mockAdmin: UserRecord = {
    _id: "user_admin_1" as unknown as Id<"users">,
    _creationTime: 1700000000000,
    clerkId: "clerk_admin_1",
    name: "Admin Alice",
    email: "admin@lendloop.org",
    role: "admin",
    isTrustedLender: true,
    createdAt: 1700000000000,
  };

  const mockStandardUser: UserRecord = {
    _id: "user_std_2" as unknown as Id<"users">,
    _creationTime: 1700000000000,
    clerkId: "clerk_std_2",
    name: "Bob Neighbor",
    email: "bob@example.com",
    role: "user",
    isTrustedLender: false,
    createdAt: 1700000000000,
  };

  const mockOtherUser: UserRecord = {
    _id: "user_std_3" as unknown as Id<"users">,
    _creationTime: 1700000000000,
    clerkId: "clerk_std_3",
    name: "Charlie Neighbor",
    email: "charlie@example.com",
    role: "user",
    isTrustedLender: false,
    createdAt: 1700000000000,
  };

  const mockTool = {
    _id: "tool_123" as unknown as Id<"tools">,
    ownerId: mockOtherUser._id,
    ownerClerkId: mockOtherUser.clerkId,
    title: "Gas Lawn Mower",
    description: "Self-propelled mower",
    category: "Lawn & Garden",
    condition: "Good" as const,
    status: "available" as const,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  // Helper to create mock context for a given caller
  const createMockCtx = (caller: UserRecord | null) => {
    return {
      auth: {
        getUserIdentity: async () =>
          caller
            ? {
                tokenIdentifier: `https://clerk.accounts.dev|${caller.clerkId}`,
                subject: caller.clerkId,
                issuer: "https://clerk.accounts.dev",
                email: caller.email,
                name: caller.name,
              }
            : null,
      },
      db: {
        query: (table: string) => ({
          withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
            let filterVal = "";
            const q = {
              eq: (_field: string, val: unknown) => {
                filterVal = String(val);
                return q;
              },
            };
            qBuilder(q);
            return {
              unique: async () => {
                if (table === "users") {
                  if (caller && caller.clerkId === filterVal) return caller;
                  if (mockAdmin.clerkId === filterVal) return mockAdmin;
                  if (mockStandardUser.clerkId === filterVal) return mockStandardUser;
                  if (mockOtherUser.clerkId === filterVal) return mockOtherUser;
                }
                return null;
              },
              collect: async () => {
                if (table === "users") return [mockAdmin, mockStandardUser, mockOtherUser];
                if (table === "tools") return [mockTool];
                return [];
              },
            };
          },
          collect: async () => {
            if (table === "users") return [mockAdmin, mockStandardUser, mockOtherUser];
            if (table === "tools") return [mockTool];
            if (table === "loans") return [];
            return [];
          },
        }),
        get: async (id: string): Promise<Record<string, unknown> | null> => {
          if (id === mockTool._id) return mockTool;
          if (id === mockAdmin._id) return mockAdmin;
          if (id === mockStandardUser._id) return mockStandardUser;
          if (id === mockOtherUser._id) return mockOtherUser;
          return null;
        },
        patch: (async () => {}) as unknown as (id: string, updates: Record<string, unknown>) => Promise<void>,
        delete: (async () => {}) as unknown as (id: string) => Promise<void>,
        insert: (async () => "inserted_id") as unknown as (table: string, doc: Record<string, unknown>) => Promise<string>,
      },
    };
  };

  describe("Negative Authorization: Rejecting Non-Admin Access", () => {
    it("should reject standard user calling adminListAllTools", async () => {
      const mockCtx = createMockCtx(mockStandardUser) as unknown as QueryCtx;
      const handler = (tools.adminListAllTools as unknown as QueryCallable<Record<string, never>, unknown>)._handler;

      await expect(handler(mockCtx, {})).rejects.toThrow(
        "Forbidden: Administrator privileges required."
      );
    });

    it("should reject standard user calling adminRemoveTool", async () => {
      const mockCtx = createMockCtx(mockStandardUser) as unknown as MutationCtx;
      const handler = (tools.adminRemoveTool as unknown as MutationCallable<{ toolId: Id<"tools"> }, unknown>)._handler;

      await expect(
        handler(mockCtx, { toolId: mockTool._id })
      ).rejects.toThrow("Forbidden: Administrator privileges required.");
    });

    it("should reject standard user calling setRole", async () => {
      const mockCtx = createMockCtx(mockStandardUser) as unknown as MutationCtx;
      const handler = (users.setRole as unknown as MutationCallable<
        { targetUserId: Id<"users">; newRole: "user" | "admin" },
        unknown
      >)._handler;

      await expect(
        handler(mockCtx, { targetUserId: mockOtherUser._id, newRole: "admin" })
      ).rejects.toThrow("Forbidden: Administrator privileges required.");
    });

    it("should reject standard user calling setTrustedLender", async () => {
      const mockCtx = createMockCtx(mockStandardUser) as unknown as MutationCtx;
      const handler = (users.setTrustedLender as unknown as MutationCallable<
        { targetUserId: Id<"users">; isTrustedLender: boolean },
        unknown
      >)._handler;

      await expect(
        handler(mockCtx, { targetUserId: mockOtherUser._id, isTrustedLender: true })
      ).rejects.toThrow("Forbidden: Administrator privileges required.");
    });

    it("should reject standard user calling listUsers", async () => {
      const mockCtx = createMockCtx(mockStandardUser) as unknown as QueryCtx;
      const handler = (users.listUsers as unknown as QueryCallable<Record<string, never>, unknown>)._handler;

      await expect(handler(mockCtx, {})).rejects.toThrow(
        "Forbidden: Administrator privileges required."
      );
    });

    it("should reject standard user calling loans.getAllLoans", async () => {
      const mockCtx = createMockCtx(mockStandardUser) as unknown as QueryCtx;
      const handler = (loans.getAllLoans as unknown as QueryCallable<{ statusFilter?: string }, unknown>)._handler;

      await expect(handler(mockCtx, {})).rejects.toThrow(
        "Forbidden: Administrator privileges required."
      );
    });

    it("should reject non-owner and non-admin from modifying another user's tool", async () => {
      const mockCtx = createMockCtx(mockStandardUser) as unknown as MutationCtx;
      const updateHandler = (tools.update as unknown as MutationCallable<
        { toolId: Id<"tools">; title?: string },
        unknown
      >)._handler;

      await expect(
        updateHandler(mockCtx, { toolId: mockTool._id, title: "Hacked title" })
      ).rejects.toThrow("Forbidden: You are not authorized to modify this tool listing.");
    });

    it("should reject non-owner and non-admin from removing another user's tool", async () => {
      const mockCtx = createMockCtx(mockStandardUser) as unknown as MutationCtx;
      const removeHandler = (tools.remove as unknown as MutationCallable<{ toolId: Id<"tools"> }, unknown>)._handler;

      await expect(
        removeHandler(mockCtx, { toolId: mockTool._id })
      ).rejects.toThrow("Forbidden: You are not authorized to modify this tool listing.");
    });
  });

  describe("Positive Authorization: Admin Capabilities", () => {
    it("should allow admin to list all tools with full owner details", async () => {
      const mockCtx = createMockCtx(mockAdmin) as unknown as QueryCtx;
      const handler = (tools.adminListAllTools as unknown as QueryCallable<Record<string, never>, unknown>)._handler;

      const result = await handler(mockCtx, {});
      expect(Array.isArray(result)).toBe(true);
      expect((result as Array<{ ownerName: string }>)[0]?.ownerName).toBe(mockOtherUser.name);
    });

    it("should allow admin to moderate and remove any tool listing", async () => {
      let deletedId: string | null = null;
      let loggedEvent: Record<string, unknown> | null = null;

      const baseCtx = createMockCtx(mockAdmin);
      baseCtx.db.delete = async (id: string) => {
        deletedId = id;
      };
      baseCtx.db.insert = async (table: string, doc: Record<string, unknown>) => {
        if (table === "automationEvents") {
          loggedEvent = doc;
        }
        return "event_123";
      };

      const handler = (tools.adminRemoveTool as unknown as MutationCallable<
        { toolId: Id<"tools">; reason?: string },
        { success: boolean; deletedToolId: string; toolTitle: string }
      >)._handler;

      const result = await handler(baseCtx as unknown as MutationCtx, {
        toolId: mockTool._id,
        reason: "Defective item",
      });

      expect(result.success).toBe(true);
      expect(deletedId).toBe(mockTool._id);
      expect(loggedEvent).not.toBeNull();
    });

    it("should allow admin to designate a user as a Trusted Lender", async () => {
      let patchedId: string | null = null;
      let patchedUpdates: Record<string, unknown> | null = null;

      const baseCtx = createMockCtx(mockAdmin);
      baseCtx.db.patch = async (id: string, updates: Record<string, unknown>) => {
        patchedId = id;
        patchedUpdates = updates;
      };

      const handler = (users.setTrustedLender as unknown as MutationCallable<
        { targetUserId: Id<"users">; isTrustedLender: boolean },
        { success: boolean; isTrustedLender: boolean }
      >)._handler;

      const result = await handler(baseCtx as unknown as MutationCtx, {
        targetUserId: mockStandardUser._id,
        isTrustedLender: true,
      });

      expect(result.success).toBe(true);
      expect(patchedId).toBe(mockStandardUser._id);
      const updates = patchedUpdates as Record<string, unknown> | null;
      expect(updates?.["isTrustedLender"]).toBe(true);
    });

    it("should allow admin to change a user role (promote to admin)", async () => {
      let patchedId: string | null = null;
      let patchedUpdates: Record<string, unknown> | null = null;

      const baseCtx = createMockCtx(mockAdmin);
      baseCtx.db.patch = async (id: string, updates: Record<string, unknown>) => {
        patchedId = id;
        patchedUpdates = updates;
      };

      const handler = (users.setRole as unknown as MutationCallable<
        { targetUserId: Id<"users">; newRole: "user" | "admin" },
        { success: boolean; role: string }
      >)._handler;

      const result = await handler(baseCtx as unknown as MutationCtx, {
        targetUserId: mockStandardUser._id,
        newRole: "admin",
      });

      expect(result.success).toBe(true);
      expect(patchedId).toBe(mockStandardUser._id);
      const updates = patchedUpdates as Record<string, unknown> | null;
      expect(updates?.["role"]).toBe("admin");
    });

    it("should allow admin to view all platform loans", async () => {
      const mockCtx = createMockCtx(mockAdmin) as unknown as QueryCtx;
      const handler = (loans.getAllLoans as unknown as QueryCallable<{ statusFilter?: string }, unknown>)._handler;

      const result = await handler(mockCtx, {});
      expect(Array.isArray(result)).toBe(true);
    });

    it("should allow admin to mark any loan returned", async () => {
      const mockLoan = {
        _id: "loan_xyz" as unknown as Id<"loans">,
        toolId: mockTool._id,
        lenderId: mockOtherUser._id,
        lenderClerkId: mockOtherUser.clerkId,
        borrowerId: mockStandardUser._id,
        borrowerClerkId: mockStandardUser.clerkId,
        status: "active" as const,
        startDate: Date.now() - 100000,
        dueDate: Date.now() + 100000,
        createdAt: Date.now() - 100000,
      };

      let patchedLoan: Record<string, unknown> | null = null;
      let patchedTool: Record<string, unknown> | null = null;

      const baseCtx = createMockCtx(mockAdmin);
      baseCtx.db.get = (async (id: string) => {
        if (id === mockLoan._id) return mockLoan;
        if (id === mockTool._id) return mockTool;
        return null;
      }) as unknown as typeof baseCtx.db.get;
      baseCtx.db.patch = async (id: string, updates: Record<string, unknown>) => {
        if (id === mockLoan._id) patchedLoan = updates;
        if (id === mockTool._id) patchedTool = updates;
      };

      const handler = (loans.markReturned as unknown as MutationCallable<
        { loanId: Id<"loans"> },
        { success: boolean }
      >)._handler;

      const result = await handler(baseCtx as unknown as MutationCtx, { loanId: mockLoan._id });
      expect(result.success).toBe(true);
      const loanUpdates = patchedLoan as Record<string, unknown> | null;
      const toolUpdates = patchedTool as Record<string, unknown> | null;
      expect(loanUpdates?.["status"]).toBe("returned");
      expect(toolUpdates?.["status"]).toBe("available");
    });
  });
});
