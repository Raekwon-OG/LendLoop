import { describe, expect, it } from "vitest";
import type { MutationCtx } from "../convex/_generated/server";
import type { Id } from "../convex/_generated/dataModel";
import type { UserRecord } from "../convex/lib/auth";

interface MutationCallable<TArgs, TResult> {
  _handler: (ctx: MutationCtx, args: TArgs) => Promise<TResult>;
}

describe("Phase 2: Authentication & User Management Logic", () => {
  const mockAdminUser: UserRecord = {
    _id: "user_admin_1" as unknown as Id<"users">,
    _creationTime: 1700000000000,
    clerkId: "clerk_admin_1",
    name: "Admin Alice",
    email: "alice@lendloop.org",
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

  describe("User Synchronization Logic", () => {
    it("should provision the first user as an administrator (bootstrap)", async () => {
      let insertedRecord: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: "https://clerk.accounts.dev|clerk_first_user",
            subject: "clerk_first_user",
            issuer: "https://clerk.accounts.dev",
            email: "founder@example.com",
            name: "Community Founder",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => null, // User does not exist yet
            }),
            take: async () => [], // 0 users in database
          }),
          insert: async (_table: string, doc: Record<string, unknown>) => {
            insertedRecord = doc;
            return "user_id_1";
          },
        },
      } as unknown as MutationCtx;

      const { syncUser } = await import("../convex/users");
      const callable = syncUser as unknown as MutationCallable<
        { preferredName?: string },
        UserRecord
      >;
      const result = await callable._handler(mockCtx, {});

      expect(insertedRecord).not.toBeNull();
      expect(insertedRecord?.["role"]).toBe("admin");
      expect(insertedRecord?.["isTrustedLender"]).toBe(true);
      expect(result.role).toBe("admin");
    });

    it("should provision subsequent users with standard 'user' role", async () => {
      let insertedRecord: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: "https://clerk.accounts.dev|clerk_second_user",
            subject: "clerk_second_user",
            issuer: "https://clerk.accounts.dev",
            email: "neighbor@example.com",
            name: "Second Neighbor",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => null, // User does not exist yet
            }),
            take: async () => [mockAdminUser], // Database already has users
          }),
          insert: async (_table: string, doc: Record<string, unknown>) => {
            insertedRecord = doc;
            return "user_id_2";
          },
        },
      } as unknown as MutationCtx;

      const { syncUser } = await import("../convex/users");
      const callable = syncUser as unknown as MutationCallable<
        { preferredName?: string },
        UserRecord
      >;
      const result = await callable._handler(mockCtx, {});

      expect(insertedRecord?.["role"]).toBe("user");
      expect(insertedRecord?.["isTrustedLender"]).toBe(false);
      expect(result.role).toBe("user");
    });

    it("should update name on existing user without modifying role", async () => {
      let patchedFields: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: "https://clerk.accounts.dev|clerk_std_2",
            subject: "clerk_std_2",
            issuer: "https://clerk.accounts.dev",
            email: "bob@example.com",
            name: "Robert Builder", // Changed name
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockStandardUser,
            }),
          }),
          patch: async (_id: string, patch: Record<string, unknown>) => {
            patchedFields = patch;
          },
        },
      } as unknown as MutationCtx;

      const { syncUser } = await import("../convex/users");
      const callable = syncUser as unknown as MutationCallable<
        { preferredName?: string },
        UserRecord
      >;
      const result = await callable._handler(mockCtx, { preferredName: "Robert Builder" });

      expect(patchedFields).toEqual({ name: "Robert Builder" });
      expect(result.name).toBe("Robert Builder");
      expect(result.role).toBe("user"); // Preserved
    });
  });

  describe("Profile Updates & Validation", () => {
    it("should reject updating profile with empty name", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_std_2",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockStandardUser,
            }),
          }),
        },
      } as unknown as MutationCtx;

      const { updateProfile } = await import("../convex/users");
      const callable = updateProfile as unknown as MutationCallable<{ name: string }, UserRecord>;
      await expect(callable._handler(mockCtx, { name: "   " })).rejects.toThrow(
        "Name cannot be empty."
      );
    });

    it("should trim and save valid display name", async () => {
      let patched: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_std_2",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockStandardUser,
            }),
          }),
          patch: async (_id: string, patch: Record<string, unknown>) => {
            patched = patch;
          },
        },
      } as unknown as MutationCtx;

      const { updateProfile } = await import("../convex/users");
      const callable = updateProfile as unknown as MutationCallable<{ name: string }, UserRecord>;
      const result = await callable._handler(mockCtx, { name: "  Bobby B.  " });

      expect(patched).toEqual({ name: "Bobby B." });
      expect(result.name).toBe("Bobby B.");
    });
  });

  describe("Admin Role & Trusted Lender Operations", () => {
    it("should prevent non-admin from modifying user roles", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_std_2", // Standard user
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockStandardUser,
            }),
          }),
        },
      } as unknown as MutationCtx;

      const { setRole } = await import("../convex/users");
      const callable = setRole as unknown as MutationCallable<
        { targetUserId: string; newRole: "user" | "admin" },
        unknown
      >;
      await expect(
        callable._handler(mockCtx, {
          targetUserId: "user_std_2",
          newRole: "admin",
        })
      ).rejects.toThrow("Forbidden: Administrator privileges required.");
    });

    it("should allow admin to promote another user to admin", async () => {
      let patched: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_admin_1",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockAdminUser,
            }),
          }),
          get: async () => mockStandardUser,
          patch: async (_id: string, patch: Record<string, unknown>) => {
            patched = patch;
          },
        },
      } as unknown as MutationCtx;

      const { setRole } = await import("../convex/users");
      const callable = setRole as unknown as MutationCallable<
        { targetUserId: string; newRole: "user" | "admin" },
        { success: boolean; role: string }
      >;
      const result = await callable._handler(mockCtx, {
        targetUserId: "user_std_2",
        newRole: "admin",
      });

      expect(patched).toEqual({ role: "admin" });
      expect(result.success).toBe(true);
      expect(result.role).toBe("admin");
    });

    it("should allow admin to designate trusted lender", async () => {
      let patched: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_admin_1",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockAdminUser,
            }),
          }),
          get: async () => mockStandardUser,
          patch: async (_id: string, patch: Record<string, unknown>) => {
            patched = patch;
          },
        },
      } as unknown as MutationCtx;

      const { setTrustedLender } = await import("../convex/users");
      const callable = setTrustedLender as unknown as MutationCallable<
        { targetUserId: string; isTrustedLender: boolean },
        { success: boolean; isTrustedLender: boolean }
      >;
      const result = await callable._handler(mockCtx, {
        targetUserId: "user_std_2",
        isTrustedLender: true,
      });

      expect(patched).toEqual({ isTrustedLender: true });
      expect(result.isTrustedLender).toBe(true);
    });
  });
});
