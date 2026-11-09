import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  hasOverlappingActiveLoan,
  requireCurrentUserRecord,
} from "./lib/auth";

/**
 * Creates a new borrow request for an available community tool.
 *
 * Validations:
 * 1. Tool must exist and be in available or borrowed status (can reserve future dates).
 * 2. User cannot borrow their own tool.
 * 3. Start date must be before or equal to end date.
 * 4. Start date cannot be in the past (allowing 1h clock-skew tolerance).
 * 5. Requested interval must not conflict with an active loan on the same tool.
 * 6. User cannot have duplicate pending requests on the same tool.
 */
export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.number(),
    endDate: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const tool = await ctx.db.get(args.toolId);
    if (!tool) {
      throw new Error("Tool not found.");
    }

    if (tool.status === "archived") {
      throw new Error("This tool has been archived and is not available for borrowing.");
    }

    if (tool.status === "maintenance") {
      throw new Error("This tool is currently undergoing maintenance and is not available for borrowing.");
    }

    const isOwner =
      (userRecord._id as string) === (tool.ownerId as string) ||
      userRecord.clerkId === tool.ownerClerkId;

    if (isOwner) {
      throw new Error("You cannot borrow your own equipment listing.");
    }

    if (args.startDate > args.endDate) {
      throw new Error("End date must be on or after the start date.");
    }

    const now = Date.now();
    const oneHourTolerance = now - 60 * 60 * 1000;
    if (args.startDate < oneHourTolerance) {
      throw new Error("Reservation start date cannot be in the past.");
    }

    // 1. Prevent collision with existing active loans on this tool
    const existingLoans = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", args.toolId))
      .collect();

    if (hasOverlappingActiveLoan(existingLoans, args.startDate, args.endDate)) {
      throw new Error(
        "This tool is already booked for an active loan during your requested date range."
      );
    }

    // 2. Prevent duplicate pending requests by the same requester for the same tool
    const existingRequests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_and_status", (q) =>
        q.eq("toolId", args.toolId).eq("status", "pending")
      )
      .collect();

    const hasDuplicatePending = existingRequests.some(
      (req) =>
        (req.requesterId as string) === (userRecord._id as string) ||
        req.requesterClerkId === userRecord.clerkId
    );

    if (hasDuplicatePending) {
      throw new Error("You already have a pending borrow request for this tool.");
    }

    // Insert borrow request record
    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: args.toolId,
      requesterId: userRecord._id,
      requesterClerkId: userRecord.clerkId,
      ownerId: tool.ownerId,
      ownerClerkId: tool.ownerClerkId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "pending",
      note: args.note?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Record webhook event queue entry for n8n automation
    await ctx.db.insert("automationEvents", {
      eventType: "request_created",
      resourceId: requestId,
      payload: JSON.stringify({
        requestId,
        toolId: args.toolId,
        toolTitle: tool.title,
        requesterId: userRecord._id,
        requesterName: userRecord.name,
        requesterEmail: userRecord.email,
        ownerId: tool.ownerId,
        ownerClerkId: tool.ownerClerkId,
        startDate: args.startDate,
        endDate: args.endDate,
        note: args.note?.trim(),
      }),
      status: "pending",
      idempotencyKey: `req_created_${requestId}`,
      attempts: 0,
      createdAt: now,
    });

    return requestId;
  },
});

/**
 * Approves a pending borrow request.
 * Creates an active loan and updates the tool status to 'borrowed'.
 * Only the tool owner or an administrator can approve requests.
 */
export const approve = mutation({
  args: {
    requestId: v.id("borrowRequests"),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Borrow request not found.");
    }

    const isOwner =
      (userRecord._id as string) === (request.ownerId as string) ||
      userRecord.clerkId === request.ownerClerkId;
    const isAdmin = userRecord.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new Error("Forbidden: Only the tool owner or an administrator can approve this request.");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot approve a request with status '${request.status}'.`);
    }

    // Verify no active loan conflicts with this reservation
    const toolLoans = await ctx.db
      .query("loans")
      .withIndex("by_tool", (q) => q.eq("toolId", request.toolId))
      .collect();

    if (hasOverlappingActiveLoan(toolLoans, request.startDate, request.endDate)) {
      throw new Error(
        "Cannot approve request: Another active loan conflicts with this date range."
      );
    }

    const now = Date.now();

    // 1. Mark request approved
    await ctx.db.patch(request._id, {
      status: "approved",
      updatedAt: now,
    });

    // 2. Create the active loan record
    const loanId = await ctx.db.insert("loans", {
      toolId: request.toolId,
      borrowRequestId: request._id,
      lenderId: request.ownerId,
      lenderClerkId: request.ownerClerkId,
      borrowerId: request.requesterId,
      borrowerClerkId: request.requesterClerkId,
      startDate: request.startDate,
      dueDate: request.endDate,
      status: "active",
      createdAt: now,
    });

    // 3. Update the tool status to 'borrowed'
    await ctx.db.patch(request.toolId, {
      status: "borrowed",
      updatedAt: now,
    });

    // 4. Queue automation event for n8n notification
    await ctx.db.insert("automationEvents", {
      eventType: "request_status_changed",
      resourceId: request._id,
      payload: JSON.stringify({
        requestId: request._id,
        loanId,
        toolId: request.toolId,
        newStatus: "approved",
        lenderId: request.ownerId,
        borrowerId: request.requesterId,
        startDate: request.startDate,
        dueDate: request.endDate,
      }),
      status: "pending",
      idempotencyKey: `req_approved_${request._id}_${now}`,
      attempts: 0,
      createdAt: now,
    });

    await ctx.db.insert("automationEvents", {
      eventType: "loan_created",
      resourceId: loanId,
      payload: JSON.stringify({
        loanId,
        toolId: request.toolId,
        lenderId: request.ownerId,
        borrowerId: request.requesterId,
        startDate: request.startDate,
        dueDate: request.endDate,
      }),
      status: "pending",
      idempotencyKey: `loan_created_${loanId}`,
      attempts: 0,
      createdAt: now,
    });

    return { success: true, loanId };
  },
});

/**
 * Declines a pending borrow request.
 * Only the tool owner or an administrator can decline requests.
 */
export const decline = mutation({
  args: {
    requestId: v.id("borrowRequests"),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Borrow request not found.");
    }

    const isOwner =
      (userRecord._id as string) === (request.ownerId as string) ||
      userRecord.clerkId === request.ownerClerkId;
    const isAdmin = userRecord.role === "admin";

    if (!isOwner && !isAdmin) {
      throw new Error("Forbidden: Only the tool owner or an administrator can decline this request.");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot decline a request with status '${request.status}'.`);
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "declined",
      updatedAt: now,
    });

    // Queue automation event for notification
    await ctx.db.insert("automationEvents", {
      eventType: "request_status_changed",
      resourceId: request._id,
      payload: JSON.stringify({
        requestId: request._id,
        toolId: request.toolId,
        newStatus: "declined",
        ownerId: request.ownerId,
        requesterId: request.requesterId,
      }),
      status: "pending",
      idempotencyKey: `req_declined_${request._id}_${now}`,
      attempts: 0,
      createdAt: now,
    });

    return { success: true };
  },
});

/**
 * Cancels a pending borrow request.
 * Can be performed by the requester (if they changed their mind) or an admin.
 */
export const cancel = mutation({
  args: {
    requestId: v.id("borrowRequests"),
  },
  handler: async (ctx, args) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Borrow request not found.");
    }

    const isRequester =
      (userRecord._id as string) === (request.requesterId as string) ||
      userRecord.clerkId === request.requesterClerkId;
    const isAdmin = userRecord.role === "admin";

    if (!isRequester && !isAdmin) {
      throw new Error("Forbidden: You can only cancel your own pending requests.");
    }

    if (request.status !== "pending") {
      throw new Error(`Cannot cancel a request with status '${request.status}'.`);
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "cancelled",
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Returns all borrow requests submitted by the currently authenticated user (My Requests).
 * Enriched with tool details and owner information.
 */
export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_requester_clerk_id", (q) =>
        q.eq("requesterClerkId", userRecord.clerkId)
      )
      .collect();

    // Enrich with tool and owner data
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const [tool, owner] = (await Promise.all([
          ctx.db.get(req.toolId),
          ctx.db.get(req.ownerId),
        ])) as [Doc<"tools"> | null, Doc<"users"> | null];

        return {
          ...req,
          toolTitle: tool?.title ?? "Unknown Equipment",
          toolCategory: tool?.category ?? "General",
          toolCondition: tool?.condition ?? "Good",
          ownerName: owner?.name ?? "Community Member",
          ownerEmail: owner?.email ?? "",
        };
      })
    );

    // Most recent requests first
    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Returns all incoming borrow requests for tools owned by the currently authenticated user.
 * Enriched with tool details and requester contact information.
 */
export const getIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const { userRecord } = await requireCurrentUserRecord(ctx);

    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_owner_clerk_id", (q) =>
        q.eq("ownerClerkId", userRecord.clerkId)
      )
      .collect();

    // Enrich with tool and requester data
    const enriched = await Promise.all(
      requests.map(async (req) => {
        const [tool, requester] = (await Promise.all([
          ctx.db.get(req.toolId),
          ctx.db.get(req.requesterId),
        ])) as [Doc<"tools"> | null, Doc<"users"> | null];

        return {
          ...req,
          toolTitle: tool?.title ?? "Unknown Equipment",
          toolCategory: tool?.category ?? "General",
          requesterName: requester?.name ?? "Neighbor",
          requesterEmail: requester?.email ?? "",
        };
      })
    );

    // Most recent requests first
    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});
