import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin, requireCurrentUserRecord } from "./lib/auth";

/**
 * Marks an active or overdue loan as returned.
 * Restores the associated equipment status back to 'available'.
 * Allowed callers: Tool Lender (owner) or Administrator.
 */
export const markReturned = mutation({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new Error("Loan record not found.");
    }

    const isLender =
      (userRecord._id as string) === (loan.lenderId as string) ||
      userRecord.clerkId === loan.lenderClerkId;
    const isAdmin = userRecord.role === "admin";

    if (!isLender && !isAdmin) {
      throw new Error(
        "Forbidden: Only the lender or an administrator can mark an item as returned."
      );
    }

    if (loan.status === "returned") {
      throw new Error("This loan has already been marked as returned.");
    }

    const now = Date.now();

    // 1. Update loan record
    await ctx.db.patch(loan._id, {
      status: "returned",
      returnedDate: now,
    });

    // 2. Restore tool status to 'available'
    await ctx.db.patch(loan.toolId, {
      status: "available",
      updatedAt: now,
    });

    // 3. Queue automation event for n8n
    await ctx.db.insert("automationEvents", {
      eventType: "request_status_changed",
      resourceId: loan._id,
      payload: JSON.stringify({
        loanId: loan._id,
        toolId: loan.toolId,
        newStatus: "returned",
        returnedDate: now,
        lenderId: loan.lenderId,
        borrowerId: loan.borrowerId,
      }),
      status: "pending",
      idempotencyKey: `loan_returned_${loan._id}_${now}`,
      attempts: 0,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Returns all active loans involving the caller (as either lender or borrower).
 */
export const getMyActiveLoans = query({
  args: {},
  handler: async (ctx) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const asLender = await ctx.db
      .query("loans")
      .withIndex("by_lender_clerk_id", (q) =>
        q.eq("lenderClerkId", userRecord.clerkId)
      )
      .collect();

    const asBorrower = await ctx.db
      .query("loans")
      .withIndex("by_borrower_clerk_id", (q) =>
        q.eq("borrowerClerkId", userRecord.clerkId)
      )
      .collect();

    const allLoans = [...asLender, ...asBorrower].filter(
      (loan) => loan.status === "active" || loan.status === "overdue"
    );

    // Remove duplicates if user lent to themselves (shouldn't happen, but safe)
    const uniqueMap = new Map();
    for (const loan of allLoans) {
      uniqueMap.set(loan._id, loan);
    }

    const enriched = await Promise.all(
      Array.from(uniqueMap.values()).map(async (loan) => {
        const [tool, borrower, lender] = (await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.borrowerId),
          ctx.db.get(loan.lenderId),
        ])) as [Doc<"tools"> | null, Doc<"users"> | null, Doc<"users"> | null];

        const isOverdue = loan.dueDate < Date.now();

        return {
          ...loan,
          computedStatus: isOverdue ? ("overdue" as const) : loan.status,
          toolTitle: tool?.title ?? "Unknown Equipment",
          toolCategory: tool?.category ?? "General",
          borrowerName: borrower?.name ?? "Neighbor",
          borrowerEmail: borrower?.email ?? "",
          lenderName: lender?.name ?? "Lender",
          lenderEmail: lender?.email ?? "",
          isCallerLender:
            (userRecord._id as string) === (loan.lenderId as string) ||
            userRecord.clerkId === loan.lenderClerkId,
        };
      })
    );

    return enriched.sort((a, b) => a.dueDate - b.dueDate);
  },
});

/**
 * Returns loan history (returned or completed loans) for the calling user.
 */
export const getMyLoanHistory = query({
  args: {},
  handler: async (ctx) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const asLender = await ctx.db
      .query("loans")
      .withIndex("by_lender_clerk_id", (q) =>
        q.eq("lenderClerkId", userRecord.clerkId)
      )
      .collect();

    const asBorrower = await ctx.db
      .query("loans")
      .withIndex("by_borrower_clerk_id", (q) =>
        q.eq("borrowerClerkId", userRecord.clerkId)
      )
      .collect();

    const completed = [...asLender, ...asBorrower].filter(
      (loan) => loan.status === "returned"
    );

    const uniqueMap = new Map();
    for (const loan of completed) {
      uniqueMap.set(loan._id, loan);
    }

    const enriched = await Promise.all(
      Array.from(uniqueMap.values()).map(async (loan) => {
        const [tool, borrower, lender] = (await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.borrowerId),
          ctx.db.get(loan.lenderId),
        ])) as [Doc<"tools"> | null, Doc<"users"> | null, Doc<"users"> | null];

        return {
          ...loan,
          toolTitle: tool?.title ?? "Unknown Equipment",
          toolCategory: tool?.category ?? "General",
          borrowerName: borrower?.name ?? "Neighbor",
          lenderName: lender?.name ?? "Lender",
          isCallerLender:
            (userRecord._id as string) === (loan.lenderId as string) ||
            userRecord.clerkId === loan.lenderClerkId,
        };
      })
    );

    return enriched.sort((a, b) => (b.returnedDate ?? 0) - (a.returnedDate ?? 0));
  },
});

/**
 * Admin query: Returns all platform loans (active, overdue, returned) for moderation and audits.
 */
export const getAllLoans = query({
  args: {
    statusFilter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const loans = await ctx.db.query("loans").collect();

    const filtered = args.statusFilter && args.statusFilter !== "all"
      ? loans.filter((l) => l.status === args.statusFilter)
      : loans;

    const enriched = await Promise.all(
      filtered.map(async (loan) => {
        const [tool, borrower, lender] = (await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.borrowerId),
          ctx.db.get(loan.lenderId),
        ])) as [Doc<"tools"> | null, Doc<"users"> | null, Doc<"users"> | null];

        const isOverdue = loan.status === "active" && loan.dueDate < Date.now();

        return {
          ...loan,
          isOverdue,
          computedStatus: isOverdue ? ("overdue" as const) : loan.status,
          toolTitle: tool?.title ?? "Unknown Equipment",
          borrowerName: borrower?.name ?? "Unknown",
          borrowerEmail: borrower?.email ?? "",
          lenderName: lender?.name ?? "Unknown",
          lenderEmail: lender?.email ?? "",
        };
      })
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});
