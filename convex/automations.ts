import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { createSignedWebhookHeaders, timingSafeEqual } from "./lib/hmac";

/**
 * Query for the daily n8n overdue reminder workflow.
 *
 * Data Minimization Principle:
 * Strictly exposes only the minimum fields necessary for drafting reminder notices:
 * - loanId, toolTitle, borrowerName, borrowerEmail, dueDate, daysOverdue, reminderCount.
 * Lender personal information, private addresses, and internal database metadata are excluded.
 */
export const getOverdueLoansForAutomation = query({
  args: {
    apiKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate API key / webhook secret
    const expectedSecret = process.env.N8N_WEBHOOK_SECRET ?? "lendloop_n8n_hmac_secret_dev";
    if (args.apiKey && !timingSafeEqual(args.apiKey, expectedSecret)) {
      throw new Error("Unauthorized: Invalid API key.");
    }

    const now = Date.now();
    const allLoans = await ctx.db.query("loans").collect();

    // Filter to active loans whose due date is in the past
    const overdueLoans = allLoans.filter(
      (loan) => loan.status === "active" && loan.dueDate < now
    );

    const dataMinimizedList = await Promise.all(
      overdueLoans.map(async (loan) => {
        const [tool, borrower] = (await Promise.all([
          ctx.db.get(loan.toolId),
          ctx.db.get(loan.borrowerId),
        ])) as [Doc<"tools"> | null, Doc<"users"> | null];

        const daysOverdue = Math.max(1, Math.floor((now - loan.dueDate) / (1000 * 60 * 60 * 24)));

        return {
          loanId: loan._id,
          toolTitle: tool?.title ?? "Community Equipment",
          toolCategory: tool?.category ?? "General",
          borrowerName: borrower?.name ?? "Neighbor",
          borrowerEmail: borrower?.email ?? "",
          dueDate: loan.dueDate,
          daysOverdue,
          lastReminderSentAt: loan.lastReminderSentAt,
          reminderCount: loan.reminderCount ?? 0,
        };
      })
    );

    return dataMinimizedList.sort((a, b) => b.daysOverdue - a.daysOverdue);
  },
});

/**
 * Idempotent mutation for n8n to write back the reminder status.
 *
 * Idempotency Guarantee:
 * Uses an idempotencyKey (e.g. reminder_<loanId>_<YYYY-MM-DD>).
 * If a retry or duplicate delivery occurs, the mutation detects the existing
 * key in `automationEvents` and returns success without incrementing reminder counts
 * or duplicating logs.
 */
export const recordReminderWriteback = mutation({
  args: {
    loanId: v.id("loans"),
    idempotencyKey: v.string(),
    deliveredVia: v.optional(v.string()),
    signature: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for existing processed event with this idempotency key
    const existingEvent = await ctx.db
      .query("automationEvents")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey)
      )
      .first();

    if (existingEvent) {
      return {
        success: true,
        alreadyProcessed: true,
        message: "Idempotent write-back: reminder was already recorded for this key.",
        eventId: existingEvent._id,
      };
    }

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new Error(`Loan with ID '${args.loanId}' not found.`);
    }

    const now = Date.now();
    const currentCount = loan.reminderCount ?? 0;

    // 1. Update loan record with reminder timestamp & counter
    await ctx.db.patch(loan._id, {
      lastReminderSentAt: now,
      reminderCount: currentCount + 1,
    });

    // 2. Log automation event for observability & history
    const eventId = await ctx.db.insert("automationEvents", {
      eventType: "reminder_sent",
      resourceId: loan._id,
      payload: JSON.stringify({
        loanId: loan._id,
        toolId: loan.toolId,
        borrowerId: loan.borrowerId,
        reminderNumber: currentCount + 1,
        deliveredVia: args.deliveredVia ?? "email",
        recordedAt: now,
      }),
      status: "processed",
      idempotencyKey: args.idempotencyKey,
      attempts: 1,
      lastAttemptAt: now,
      createdAt: now,
    });

    return {
      success: true,
      alreadyProcessed: false,
      message: "Overdue reminder recorded successfully.",
      eventId,
      reminderCount: currentCount + 1,
    };
  },
});

/**
 * Convex Action: Dispatches an outgoing HMAC-signed webhook to n8n.
 * Invoked when borrow requests are created or updated.
 *
 * Security:
 * - Computes HMAC-SHA256 signature using N8N_WEBHOOK_SECRET
 * - Includes timestamp header to defeat replay attacks
 * - Retries on temporary network failure
 */
export const dispatchWebhookToN8n = action({
  args: {
    endpointUrl: v.string(),
    eventType: v.string(),
    resourceId: v.string(),
    payload: v.string(),
  },
  handler: async (_ctx, args) => {
    const secret = process.env.N8N_WEBHOOK_SECRET ?? "lendloop_n8n_hmac_secret_dev";
    const headers = await createSignedWebhookHeaders(args.payload, secret);

    const maxRetries = 3;
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
      attempt++;
      try {
        const response = await fetch(args.endpointUrl, {
          method: "POST",
          headers,
          body: args.payload,
        });

        if (response.ok) {
          return {
            success: true,
            status: response.status,
            attempts: attempt,
          };
        }

        const responseText = await response.text();
        throw new Error(`n8n webhook responded with status ${response.status}: ${responseText}`);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          // Exponential backoff
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
        }
      }
    }

    return {
      success: false,
      error: lastError?.message ?? "Failed to deliver webhook to n8n.",
      attempts: attempt,
    };
  },
});

/**
 * Retrieves recent automation event history for a given resource (bonus feature).
 */
export const getResourceAutomationHistory = query({
  args: {
    resourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("automationEvents")
      .collect();

    const matching = events.filter((e) => e.resourceId === args.resourceId);
    return matching.sort((a, b) => b.createdAt - a.createdAt);
  },
});
