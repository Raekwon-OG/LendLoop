import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * LendLoop Convex Schema Definition
 *
 * Defines the core database entities:
 * - users: Registered community members and admins
 * - tools: Equipment catalog shared across the neighborhood
 * - borrowRequests: Reservation and borrowing requests with date ranges
 * - loans: Active, returned, or overdue borrowing transactions
 * - automationEvents: Asynchronous webhook & automation queue for n8n workflows
 * - healthCheck: Connectivity check table
 */
export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    isTrustedLender: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_role", ["role"])
    .index("by_email", ["email"]),

  tools: defineTable({
    ownerId: v.id("users"),
    ownerClerkId: v.string(),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    condition: v.union(v.literal("Like New"), v.literal("Good"), v.literal("Fair")),
    status: v.union(
      v.literal("available"),
      v.literal("borrowed"),
      v.literal("maintenance"),
      v.literal("archived")
    ),
    imageStorageId: v.optional(v.id("_storage")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_clerk_id", ["ownerClerkId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_status_and_category", ["status", "category"]),

  borrowRequests: defineTable({
    toolId: v.id("tools"),
    requesterId: v.id("users"),
    requesterClerkId: v.string(),
    ownerId: v.id("users"),
    ownerClerkId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled")
    ),
    note: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_requester", ["requesterId"])
    .index("by_requester_clerk_id", ["requesterClerkId"])
    .index("by_owner", ["ownerId"])
    .index("by_owner_clerk_id", ["ownerClerkId"])
    .index("by_status", ["status"])
    .index("by_tool_and_status", ["toolId", "status"]),

  loans: defineTable({
    toolId: v.id("tools"),
    borrowRequestId: v.id("borrowRequests"),
    lenderId: v.id("users"),
    lenderClerkId: v.string(),
    borrowerId: v.id("users"),
    borrowerClerkId: v.string(),
    startDate: v.number(),
    dueDate: v.number(),
    returnedDate: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("returned"), v.literal("overdue")),
    lastReminderSentAt: v.optional(v.number()),
    reminderCount: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tool", ["toolId"])
    .index("by_borrower", ["borrowerId"])
    .index("by_borrower_clerk_id", ["borrowerClerkId"])
    .index("by_lender", ["lenderId"])
    .index("by_lender_clerk_id", ["lenderClerkId"])
    .index("by_status", ["status"])
    .index("by_due_date", ["dueDate"]),

  automationEvents: defineTable({
    eventType: v.union(
      v.literal("request_created"),
      v.literal("request_status_changed"),
      v.literal("loan_created"),
      v.literal("loan_overdue"),
      v.literal("reminder_sent")
    ),
    resourceId: v.string(),
    payload: v.string(),
    status: v.union(v.literal("pending"), v.literal("processed"), v.literal("failed")),
    idempotencyKey: v.string(),
    attempts: v.number(),
    lastAttemptAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_idempotency_key", ["idempotencyKey"])
    .index("by_event_type", ["eventType"])
    .index("by_resource", ["resourceId"]),

  healthCheck: defineTable({
    service: v.string(),
    status: v.string(),
    timestamp: v.number(),
  }),
});
