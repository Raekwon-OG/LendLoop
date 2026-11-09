import { describe, expect, it } from "vitest";
import type { QueryCtx } from "../convex/_generated/server";
import {
  assertToolOwnerOrAdmin,
  canAccessBorrowRequest,
  canAccessLoan,
  doDateRangesOverlap,
  hasOverlappingActiveLoan,
  requireAdmin,
  requireAuthenticatedUser,
  requireCurrentUserRecord,
  type UserRecord,
} from "../convex/lib/auth";

describe("Phase 1: Authorization & Access Control Helpers", () => {
  // Mock Data
  const mockUserRecord: UserRecord = {
    _id: "user_123",
    clerkId: "clerk_user_123",
    name: "Alice Neighbor",
    email: "alice@example.com",
    role: "user",
    isTrustedLender: true,
    createdAt: 1700000000000,
  };

  const mockOtherUserRecord: UserRecord = {
    _id: "user_456",
    clerkId: "clerk_user_456",
    name: "Bob Builder",
    email: "bob@example.com",
    role: "user",
    isTrustedLender: false,
    createdAt: 1700000000000,
  };

  const mockAdminRecord: UserRecord = {
    _id: "user_admin_999",
    clerkId: "clerk_admin_999",
    name: "Charlie Admin",
    email: "admin@lendloop.org",
    role: "admin",
    isTrustedLender: true,
    createdAt: 1700000000000,
  };

  describe("Authentication Identity Extraction", () => {
    it("should throw when request is unauthenticated", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => null,
        },
      } as unknown as QueryCtx;

      await expect(requireAuthenticatedUser(mockCtx)).rejects.toThrow(
        "Unauthenticated: A valid Clerk session token is required."
      );
    });

    it("should extract identity when authenticated", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: "https://clerk.accounts.dev|clerk_user_123",
            subject: "clerk_user_123",
            issuer: "https://clerk.accounts.dev",
            email: "alice@example.com",
            name: "Alice Neighbor",
          }),
        },
      } as unknown as QueryCtx;

      const identity = await requireAuthenticatedUser(mockCtx);
      expect(identity.clerkId).toBe("clerk_user_123");
      expect(identity.email).toBe("alice@example.com");
    });
  });

  describe("Database User Record Assertion", () => {
    it("should throw when authenticated user is not yet synced to Convex", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: "https://clerk.accounts.dev|clerk_user_new",
            subject: "clerk_user_new",
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => null,
            }),
          }),
        },
      } as unknown as QueryCtx;

      await expect(requireCurrentUserRecord(mockCtx)).rejects.toThrow(
        "Forbidden: User profile for Clerk ID 'clerk_user_new' has not been synced to the database."
      );
    });

    it("should succeed and return user record when synced", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: "https://clerk.accounts.dev|clerk_user_123",
            subject: "clerk_user_123",
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockUserRecord,
            }),
          }),
        },
      } as unknown as QueryCtx;

      const result = await requireCurrentUserRecord(mockCtx);
      expect(result.userRecord._id).toBe("user_123");
      expect(result.userRecord.role).toBe("user");
    });
  });

  describe("Admin Role Verification", () => {
    it("should reject standard user attempting admin operation", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_user_123",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockUserRecord,
            }),
          }),
        },
      } as unknown as QueryCtx;

      await expect(requireAdmin(mockCtx)).rejects.toThrow(
        "Forbidden: Administrator privileges required."
      );
    });

    it("should permit administrator", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            subject: "clerk_admin_999",
          }),
        },
        db: {
          query: () => ({
            withIndex: () => ({
              unique: async () => mockAdminRecord,
            }),
          }),
        },
      } as unknown as QueryCtx;

      const result = await requireAdmin(mockCtx);
      expect(result.userRecord.role).toBe("admin");
    });
  });

  describe("Tool Ownership & Moderation Rules", () => {
    const mockTool = {
      _id: "tool_saw_1",
      ownerId: "user_123",
      ownerClerkId: "clerk_user_123",
    };

    it("should allow owner to modify their tool", () => {
      expect(() => assertToolOwnerOrAdmin(mockUserRecord, mockTool)).not.toThrow();
    });

    it("should allow admin to modify any tool", () => {
      expect(() => assertToolOwnerOrAdmin(mockAdminRecord, mockTool)).not.toThrow();
    });

    it("should forbid other users from modifying someone else's tool", () => {
      expect(() => assertToolOwnerOrAdmin(mockOtherUserRecord, mockTool)).toThrow(
        "Forbidden: You are not authorized to modify this tool listing."
      );
    });
  });

  describe("Borrow Request Access Control", () => {
    const mockRequest = {
      _id: "req_1",
      requesterId: "user_456",
      requesterClerkId: "clerk_user_456",
      ownerId: "user_123",
      ownerClerkId: "clerk_user_123",
    };

    it("should allow requester to view request", () => {
      expect(canAccessBorrowRequest(mockOtherUserRecord, mockRequest)).toBe(true);
    });

    it("should allow tool owner to view request", () => {
      expect(canAccessBorrowRequest(mockUserRecord, mockRequest)).toBe(true);
    });

    it("should allow admin to view request", () => {
      expect(canAccessBorrowRequest(mockAdminRecord, mockRequest)).toBe(true);
    });

    it("should deny an unrelated neighbor from viewing request", () => {
      const thirdParty: UserRecord = {
        ...mockUserRecord,
        _id: "user_789",
        clerkId: "clerk_user_789",
      };
      expect(canAccessBorrowRequest(thirdParty, mockRequest)).toBe(false);
    });
  });

  describe("Loan Access Control", () => {
    const mockLoan = {
      _id: "loan_1",
      lenderId: "user_123",
      lenderClerkId: "clerk_user_123",
      borrowerId: "user_456",
      borrowerClerkId: "clerk_user_456",
    };

    it("should allow lender to view loan", () => {
      expect(canAccessLoan(mockUserRecord, mockLoan)).toBe(true);
    });

    it("should allow borrower to view loan", () => {
      expect(canAccessLoan(mockOtherUserRecord, mockLoan)).toBe(true);
    });

    it("should allow admin to view loan", () => {
      expect(canAccessLoan(mockAdminRecord, mockLoan)).toBe(true);
    });

    it("should deny unrelated neighbor from viewing loan", () => {
      const thirdParty: UserRecord = {
        ...mockUserRecord,
        _id: "user_789",
        clerkId: "clerk_user_789",
      };
      expect(canAccessLoan(thirdParty, mockLoan)).toBe(false);
    });
  });

  describe("Overlapping Reservation & Loan Rules", () => {
    const day = 24 * 60 * 60 * 1000;
    const baseTime = 1700000000000;

    it("should detect overlapping dates", () => {
      expect(
        doDateRangesOverlap(
          baseTime + 1 * day,
          baseTime + 5 * day,
          baseTime + 3 * day,
          baseTime + 7 * day
        )
      ).toBe(true);

      expect(
        doDateRangesOverlap(
          baseTime + 2 * day,
          baseTime + 6 * day,
          baseTime + 3 * day,
          baseTime + 4 * day
        )
      ).toBe(true);
    });

    it("should allow adjacent non-overlapping dates", () => {
      expect(
        doDateRangesOverlap(
          baseTime + 1 * day,
          baseTime + 3 * day,
          baseTime + 3 * day,
          baseTime + 5 * day
        )
      ).toBe(false);

      expect(
        doDateRangesOverlap(
          baseTime + 5 * day,
          baseTime + 7 * day,
          baseTime + 1 * day,
          baseTime + 3 * day
        )
      ).toBe(false);
    });

    it("should block request if active loan overlaps, but ignore returned loans", () => {
      const loans = [
        {
          startDate: baseTime + 1 * day,
          dueDate: baseTime + 4 * day,
          status: "returned",
        },
        {
          startDate: baseTime + 5 * day,
          dueDate: baseTime + 8 * day,
          status: "active",
        },
      ];

      expect(hasOverlappingActiveLoan(loans, baseTime + 2 * day, baseTime + 3 * day)).toBe(false);
      expect(hasOverlappingActiveLoan(loans, baseTime + 6 * day, baseTime + 7 * day)).toBe(true);
    });
  });
});
