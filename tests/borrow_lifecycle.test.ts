import { describe, expect, it } from "vitest";
import type { MutationCtx } from "../convex/_generated/server";
import type { Id } from "../convex/_generated/dataModel";
import type { UserRecord } from "../convex/lib/auth";
import * as borrowRequests from "../convex/borrowRequests";
import * as loans from "../convex/loans";

interface MutationCallable<TArgs, TResult> {
  _handler: (ctx: MutationCtx, args: TArgs) => Promise<TResult>;
}

describe("Phase 5: Borrowing Lifecycle & Collision Prevention", () => {
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

  const mockBorrower: UserRecord = {
    _id: "user_borrower_2" as unknown as Id<"users">,
    _creationTime: 1700000000000,
    clerkId: "clerk_borrower_2",
    name: "Bob Borrower",
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
    _id: "tool_saw_1" as unknown as Id<"tools">,
    ownerId: mockOwner._id,
    ownerClerkId: mockOwner.clerkId,
    title: "DeWalt Circular Saw",
    description: "7-1/4 inch with carbide blade",
    category: "Power Tools",
    condition: "Good" as const,
    status: "available" as const,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const createBorrowHandler = (borrowRequests.create as unknown as MutationCallable<
    { toolId: Id<"tools">; startDate: number; endDate: number; note?: string },
    string
  >)._handler;

  const approveBorrowHandler = (borrowRequests.approve as unknown as MutationCallable<
    { requestId: Id<"borrowRequests"> },
    { success: boolean; loanId: string }
  >)._handler;

  const declineBorrowHandler = (borrowRequests.decline as unknown as MutationCallable<
    { requestId: Id<"borrowRequests"> },
    { success: boolean }
  >)._handler;

  const cancelBorrowHandler = (borrowRequests.cancel as unknown as MutationCallable<
    { requestId: Id<"borrowRequests"> },
    { success: boolean }
  >)._handler;

  const markReturnedHandler = (loans.markReturned as unknown as MutationCallable<
    { loanId: Id<"loans"> },
    { success: boolean }
  >)._handler;

  describe("Borrow Request Creation & Validation", () => {
    it("should successfully create a pending borrow request with valid dates", async () => {
      const now = Date.now();
      const startDate = now + 1000 * 60 * 60 * 24; // Tomorrow
      const endDate = now + 1000 * 60 * 60 * 72; // In 3 days

      let insertedRecord: Record<string, unknown> | null = null;
      let automationQueued = false;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockBorrower.clerkId}`,
            subject: mockBorrower.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: (table: string) => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = {
                eq: () => q,
              };
              qBuilder(q);
              return {
                unique: async () => (table === "users" ? mockBorrower : null),
                collect: async () => [],
              };
            },
          }),
          get: async (id: string) => (id === mockTool._id ? mockTool : null),
          insert: async (table: string, doc: Record<string, unknown>) => {
            if (table === "borrowRequests") {
              insertedRecord = doc;
              return "req_new_123" as unknown as Id<"borrowRequests">;
            }
            if (table === "automationEvents") {
              automationQueued = true;
              return "event_123" as unknown as Id<"automationEvents">;
            }
            return "id_123";
          },
        },
      } as unknown as MutationCtx;

      const result = await createBorrowHandler(mockCtx, {
        toolId: mockTool._id,
        startDate,
        endDate,
        note: "Need it for weekend deck repair",
      });

      expect(result).toBe("req_new_123");
      expect(insertedRecord).not.toBeNull();
      const record = insertedRecord as Record<string, unknown> | null;
      expect(record?.["status"]).toBe("pending");
      expect(record?.["requesterId"]).toBe(mockBorrower._id);
      expect(record?.["ownerId"]).toBe(mockOwner._id);
      expect(record?.["note"]).toBe("Need it for weekend deck repair");
      expect(automationQueued).toBe(true);
    });

    it("should reject an owner attempting to borrow their own tool", async () => {
      const now = Date.now();
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockOwner.clerkId}`,
            subject: mockOwner.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockOwner,
              };
            },
          }),
          get: async () => mockTool,
        },
      } as unknown as MutationCtx;

      await expect(
        createBorrowHandler(mockCtx, {
          toolId: mockTool._id,
          startDate: now + 100000,
          endDate: now + 200000,
        })
      ).rejects.toThrow("You cannot borrow your own equipment listing.");
    });

    it("should reject requests where end date is before start date", async () => {
      const now = Date.now();
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockBorrower.clerkId}`,
            subject: mockBorrower.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockBorrower,
              };
            },
          }),
          get: async () => mockTool,
        },
      } as unknown as MutationCtx;

      await expect(
        createBorrowHandler(mockCtx, {
          toolId: mockTool._id,
          startDate: now + 200000,
          endDate: now + 100000,
        })
      ).rejects.toThrow("End date must be on or after the start date.");
    });

    it("should reject reservation requests starting in the past", async () => {
      const pastStart = Date.now() - 1000 * 60 * 60 * 24 * 7; // 7 days ago
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockBorrower.clerkId}`,
            subject: mockBorrower.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockBorrower,
              };
            },
          }),
          get: async () => mockTool,
        },
      } as unknown as MutationCtx;

      await expect(
        createBorrowHandler(mockCtx, {
          toolId: mockTool._id,
          startDate: pastStart,
          endDate: pastStart + 100000,
        })
      ).rejects.toThrow("Reservation start date cannot be in the past.");
    });

    it("should reject requests overlapping an active loan on the same tool (collision prevention)", async () => {
      const baseTime = Date.now() + 1000 * 60 * 60 * 24; // tomorrow
      const activeLoan = {
        _id: "loan_existing_1",
        toolId: mockTool._id,
        startDate: baseTime,
        dueDate: baseTime + 1000 * 60 * 60 * 48, // 48h loan
        status: "active",
      };

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockBorrower.clerkId}`,
            subject: mockBorrower.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: (table: string) => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => (table === "users" ? mockBorrower : null),
                collect: async () => (table === "loans" ? [activeLoan] : []),
              };
            },
          }),
          get: async () => mockTool,
        },
      } as unknown as MutationCtx;

      // Attempt to book overlapping interval
      await expect(
        createBorrowHandler(mockCtx, {
          toolId: mockTool._id,
          startDate: baseTime + 1000 * 60 * 60 * 12, // midway through active loan
          endDate: baseTime + 1000 * 60 * 60 * 60,
        })
      ).rejects.toThrow(
        "This tool is already booked for an active loan during your requested date range."
      );
    });
  });

  describe("Borrow Request Approval Workflow", () => {
    const mockRequest = {
      _id: "req_pending_1" as unknown as Id<"borrowRequests">,
      toolId: mockTool._id,
      requesterId: mockBorrower._id,
      requesterClerkId: mockBorrower.clerkId,
      ownerId: mockOwner._id,
      ownerClerkId: mockOwner.clerkId,
      startDate: Date.now() + 100000,
      endDate: Date.now() + 200000,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it("should allow the tool owner to approve a pending request, creating an active loan", async () => {
      let updatedRequest: Record<string, unknown> | null = null;
      let updatedTool: Record<string, unknown> | null = null;
      let createdLoan: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockOwner.clerkId}`,
            subject: mockOwner.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: (table: string) => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => (table === "users" ? mockOwner : null),
                collect: async () => [],
              };
            },
          }),
          get: async (id: string) => {
            if (id === mockRequest._id) return mockRequest;
            if (id === mockTool._id) return mockTool;
            return null;
          },
          patch: async (id: string, updates: Record<string, unknown>) => {
            if (id === mockRequest._id) updatedRequest = updates;
            if (id === mockTool._id) updatedTool = updates;
          },
          insert: async (table: string, doc: Record<string, unknown>) => {
            if (table === "loans") {
              createdLoan = doc;
              return "loan_new_1" as unknown as Id<"loans">;
            }
            return "event_id";
          },
        },
      } as unknown as MutationCtx;

      const result = await approveBorrowHandler(mockCtx, { requestId: mockRequest._id });

      expect(result.success).toBe(true);
      expect(result.loanId).toBe("loan_new_1");
      const reqUpdates = updatedRequest as Record<string, unknown> | null;
      const toolUpdates = updatedTool as Record<string, unknown> | null;
      const loanUpdates = createdLoan as Record<string, unknown> | null;
      expect(reqUpdates?.["status"]).toBe("approved");
      expect(toolUpdates?.["status"]).toBe("borrowed");
      expect(loanUpdates?.["status"]).toBe("active");
      expect(loanUpdates?.["borrowerId"]).toBe(mockBorrower._id);
      expect(loanUpdates?.["lenderId"]).toBe(mockOwner._id);
    });

    it("should deny approval by an unauthorized third party", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockBorrower.clerkId}`,
            subject: mockBorrower.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockBorrower,
              };
            },
          }),
          get: async () => mockRequest,
        },
      } as unknown as MutationCtx;

      await expect(
        approveBorrowHandler(mockCtx, { requestId: mockRequest._id })
      ).rejects.toThrow("Forbidden: Only the tool owner or an administrator can approve this request.");
    });
  });

  describe("Decline & Cancellation Workflow", () => {
    const mockRequest = {
      _id: "req_pending_2" as unknown as Id<"borrowRequests">,
      toolId: mockTool._id,
      requesterId: mockBorrower._id,
      requesterClerkId: mockBorrower.clerkId,
      ownerId: mockOwner._id,
      ownerClerkId: mockOwner.clerkId,
      startDate: Date.now() + 100000,
      endDate: Date.now() + 200000,
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    it("should allow the owner to decline a pending request", async () => {
      let updatedRequest: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockOwner.clerkId}`,
            subject: mockOwner.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockOwner,
              };
            },
          }),
          get: async () => mockRequest,
          patch: async (id: string, updates: Record<string, unknown>) => {
            if (id === mockRequest._id) updatedRequest = updates;
          },
          insert: async () => "event_id",
        },
      } as unknown as MutationCtx;

      const result = await declineBorrowHandler(mockCtx, { requestId: mockRequest._id });
      expect(result.success).toBe(true);
      const reqUpdates = updatedRequest as Record<string, unknown> | null;
      expect(reqUpdates?.["status"]).toBe("declined");
    });

    it("should allow the requester to cancel their own pending request", async () => {
      let updatedRequest: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockBorrower.clerkId}`,
            subject: mockBorrower.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockBorrower,
              };
            },
          }),
          get: async () => mockRequest,
          patch: async (id: string, updates: Record<string, unknown>) => {
            if (id === mockRequest._id) updatedRequest = updates;
          },
        },
      } as unknown as MutationCtx;

      const result = await cancelBorrowHandler(mockCtx, { requestId: mockRequest._id });
      expect(result.success).toBe(true);
      const reqUpdates = updatedRequest as Record<string, unknown> | null;
      expect(reqUpdates?.["status"]).toBe("cancelled");
    });
  });

  describe("Loan Return Workflow", () => {
    const mockActiveLoan = {
      _id: "loan_active_1" as unknown as Id<"loans">,
      toolId: mockTool._id,
      borrowRequestId: "req_123" as unknown as Id<"borrowRequests">,
      lenderId: mockOwner._id,
      lenderClerkId: mockOwner.clerkId,
      borrowerId: mockBorrower._id,
      borrowerClerkId: mockBorrower.clerkId,
      startDate: Date.now() - 1000 * 60 * 60 * 48,
      dueDate: Date.now() + 1000 * 60 * 60 * 24,
      status: "active" as const,
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
    };

    it("should allow lender to mark an active loan as returned and restore tool availability", async () => {
      let updatedLoan: Record<string, unknown> | null = null;
      let updatedTool: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockOwner.clerkId}`,
            subject: mockOwner.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockOwner,
              };
            },
          }),
          get: async (id: string) => (id === mockActiveLoan._id ? mockActiveLoan : null),
          patch: async (id: string, updates: Record<string, unknown>) => {
            if (id === mockActiveLoan._id) updatedLoan = updates;
            if (id === mockTool._id) updatedTool = updates;
          },
          insert: async () => "event_id",
        },
      } as unknown as MutationCtx;

      const result = await markReturnedHandler(mockCtx, { loanId: mockActiveLoan._id });
      expect(result.success).toBe(true);
      const loanUpdates = updatedLoan as Record<string, unknown> | null;
      const toolUpdates = updatedTool as Record<string, unknown> | null;
      expect(loanUpdates?.["status"]).toBe("returned");
      expect(loanUpdates?.["returnedDate"]).toBeDefined();
      expect(toolUpdates?.["status"]).toBe("available");
    });

    it("should allow admin to mark a loan returned", async () => {
      let updatedLoan: Record<string, unknown> | null = null;

      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockAdmin.clerkId}`,
            subject: mockAdmin.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockAdmin,
              };
            },
          }),
          get: async (id: string) => (id === mockActiveLoan._id ? mockActiveLoan : null),
          patch: async (id: string, updates: Record<string, unknown>) => {
            if (id === mockActiveLoan._id) updatedLoan = updates;
          },
          insert: async () => "event_id",
        },
      } as unknown as MutationCtx;

      const result = await markReturnedHandler(mockCtx, { loanId: mockActiveLoan._id });
      expect(result.success).toBe(true);
      const loanUpdates = updatedLoan as Record<string, unknown> | null;
      expect(loanUpdates?.["status"]).toBe("returned");
    });

    it("should reject non-lender / non-admin from marking loan returned", async () => {
      const mockCtx = {
        auth: {
          getUserIdentity: async () => ({
            tokenIdentifier: `https://clerk.accounts.dev|${mockBorrower.clerkId}`,
            subject: mockBorrower.clerkId,
            issuer: "https://clerk.accounts.dev",
          }),
        },
        db: {
          query: () => ({
            withIndex: (_name: string, qBuilder: (q: { eq: (field: string, val: unknown) => unknown }) => unknown) => {
              const q = { eq: () => q };
              qBuilder(q);
              return {
                unique: async () => mockBorrower,
              };
            },
          }),
          get: async () => mockActiveLoan,
        },
      } as unknown as MutationCtx;

      await expect(
        markReturnedHandler(mockCtx, { loanId: mockActiveLoan._id })
      ).rejects.toThrow("Forbidden: Only the lender or an administrator can mark an item as returned.");
    });
  });
});
