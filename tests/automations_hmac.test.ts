import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import type { MutationCtx, QueryCtx } from "../convex/_generated/server";
import type { Id } from "../convex/_generated/dataModel";
import * as automations from "../convex/automations";
import {
  generateHmacSignature,
  verifyHmacSignature,
  timingSafeEqual,
  createSignedWebhookHeaders,
} from "../convex/lib/hmac";

interface MutationCallable<TArgs, TResult> {
  _handler: (ctx: MutationCtx, args: TArgs) => Promise<TResult>;
}

interface QueryCallable<TArgs, TResult> {
  _handler: (ctx: QueryCtx, args: TArgs) => Promise<TResult>;
}

describe("Automations & n8n Two-Way HMAC Security", () => {
  const secretKey = "test_shared_hmac_secret_key_12345";
  const samplePayload = JSON.stringify({
    eventType: "request_created",
    requestId: "req_test_abc",
    toolTitle: "Cordless Drill",
    requesterName: "Alice Neighbor",
  });

  describe("HMAC Cryptography and Signature Verification", () => {
    it("generates a valid, deterministic HMAC-SHA256 signature", async () => {
      const sig1 = await generateHmacSignature(samplePayload, secretKey);
      const sig2 = await generateHmacSignature(samplePayload, secretKey);

      expect(sig1).toHaveLength(64); // SHA-256 produces 64-char hex string
      expect(sig1).toBe(sig2);
    });

    it("verifies authentic HMAC signatures successfully", async () => {
      const signature = await generateHmacSignature(samplePayload, secretKey);
      const isValid = await verifyHmacSignature(samplePayload, secretKey, signature);
      expect(isValid).toBe(true);
    });

    it("rejects tampered payloads", async () => {
      const signature = await generateHmacSignature(samplePayload, secretKey);
      const tamperedPayload = JSON.stringify({
        ...JSON.parse(samplePayload),
        toolTitle: "Tampered Expensive Tool",
      });

      const isValid = await verifyHmacSignature(tamperedPayload, secretKey, signature);
      expect(isValid).toBe(false);
    });

    it("rejects signatures generated with an incorrect secret", async () => {
      const signature = await generateHmacSignature(samplePayload, "wrong_secret");
      const isValid = await verifyHmacSignature(samplePayload, secretKey, signature);
      expect(isValid).toBe(false);
    });

    it("performs timing-safe string comparison correctly", () => {
      expect(timingSafeEqual("correct-token-abc", "correct-token-abc")).toBe(true);
      expect(timingSafeEqual("correct-token-abc", "wrong-token-xyz")).toBe(false);
      expect(timingSafeEqual("short", "longer-string")).toBe(false);
    });

    it("produces standard anti-replay webhook headers", async () => {
      const headers = await createSignedWebhookHeaders(samplePayload, secretKey);

      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["X-LendLoop-Signature"]).toHaveLength(64);
      expect(Number(headers["X-LendLoop-Timestamp"])).toBeGreaterThan(0);

      // Verify that the signed payload matches timestamp.payload
      const expectedPayloadToSign = `${headers["X-LendLoop-Timestamp"]}.${samplePayload}`;
      const isValid = await verifyHmacSignature(
        expectedPayloadToSign,
        secretKey,
        headers["X-LendLoop-Signature"]!
      );
      expect(isValid).toBe(true);
    });
  });

  describe("Data Minimization in Overdue Loans Query", () => {
    const handler = (
      automations.getOverdueLoansForAutomation as unknown as QueryCallable<
        { apiKey?: string },
        Array<{
          loanId: string;
          toolTitle: string;
          toolCategory: string;
          borrowerName: string;
          borrowerEmail: string;
          dueDate: number;
          daysOverdue: number;
          lastReminderSentAt?: number;
          reminderCount: number;
        }>
      >
    )._handler;

    it("minimizes borrower data and excludes sensitive lender & internal fields", async () => {
      const now = Date.now();
      const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;

      const mockLoan = {
        _id: "loan_overdue_1" as unknown as Id<"loans">,
        toolId: "tool_1" as unknown as Id<"tools">,
        borrowRequestId: "req_1" as unknown as Id<"borrowRequests">,
        lenderId: "user_lender_1" as unknown as Id<"users">,
        lenderClerkId: "clerk_lender_1",
        borrowerId: "user_borrower_2" as unknown as Id<"users">,
        borrowerClerkId: "clerk_borrower_2",
        startDate: threeDaysAgo - 7 * 24 * 60 * 60 * 1000,
        dueDate: threeDaysAgo,
        status: "active" as const,
        createdAt: threeDaysAgo - 7 * 24 * 60 * 60 * 1000,
      };

      const mockTool = {
        _id: "tool_1" as unknown as Id<"tools">,
        ownerId: "user_lender_1" as unknown as Id<"users">,
        title: "Heavy-Duty Pressure Washer",
        category: "Cleaning & Maintenance",
        condition: "Good" as const,
        status: "borrowed" as const,
      };

      const mockBorrower = {
        _id: "user_borrower_2" as unknown as Id<"users">,
        name: "Jane Borrower",
        email: "jane.borrower@example.com",
        clerkId: "clerk_borrower_2",
      };

      const mockCtx = {
        db: {
          query: () => ({
            collect: async () => [mockLoan],
          }),
          get: async (id: unknown) => {
            if (id === "tool_1") return mockTool;
            if (id === "user_borrower_2") return mockBorrower;
            return null;
          },
        },
      } as unknown as QueryCtx;

      const result = await handler(mockCtx, {});

      expect(result).toHaveLength(1);
      const record = result[0]!;

      // Verifies data minimization
      expect(record.loanId).toBe("loan_overdue_1");
      expect(record.toolTitle).toBe("Heavy-Duty Pressure Washer");
      expect(record.toolCategory).toBe("Cleaning & Maintenance");
      expect(record.borrowerName).toBe("Jane Borrower");
      expect(record.borrowerEmail).toBe("jane.borrower@example.com");
      expect(record.daysOverdue).toBeGreaterThanOrEqual(3);

      // Verify omitted sensitive information:
      const rawRecord = record as Record<string, unknown>;
      expect(rawRecord.lenderId).toBeUndefined();
      expect(rawRecord.lenderEmail).toBeUndefined();
      expect(rawRecord.lenderClerkId).toBeUndefined();
      expect(rawRecord.borrowerClerkId).toBeUndefined();
    });
  });

  describe("Idempotent Reminder Write-Backs", () => {
    const handler = (
      automations.recordReminderWriteback as unknown as MutationCallable<
        {
          loanId: Id<"loans">;
          idempotencyKey: string;
          deliveredVia?: string;
          signature?: string;
        },
        {
          success: boolean;
          alreadyProcessed: boolean;
          message: string;
          eventId: unknown;
          reminderCount?: number;
        }
      >
    )._handler;

    it("records a reminder write-back on first invocation", async () => {
      let patchedData: Record<string, unknown> | null = null;
      let insertedEvent: Record<string, unknown> | null = null;

      const mockLoan = {
        _id: "loan_abc" as unknown as Id<"loans">,
        toolId: "tool_1" as unknown as Id<"tools">,
        borrowerId: "user_1" as unknown as Id<"users">,
        reminderCount: 0,
      };

      const mockCtx = {
        db: {
          query: () => ({
            withIndex: () => ({
              first: async () => null, // No existing event
            }),
          }),
          get: async () => mockLoan,
          patch: async (_id: unknown, data: Record<string, unknown>) => {
            patchedData = data;
          },
          insert: async (_table: string, data: Record<string, unknown>) => {
            insertedEvent = data;
            return "event_new_123";
          },
        },
      } as unknown as MutationCtx;

      const result = await handler(mockCtx, {
        loanId: "loan_abc" as unknown as Id<"loans">,
        idempotencyKey: "reminder_loan_abc_2026-11-09",
        deliveredVia: "email",
      });

      expect(result.success).toBe(true);
      expect(result.alreadyProcessed).toBe(false);
      expect(result.reminderCount).toBe(1);

      expect(patchedData).not.toBeNull();
      expect((patchedData as Record<string, unknown> | null)?.reminderCount).toBe(1);
      expect((patchedData as Record<string, unknown> | null)?.lastReminderSentAt).toBeTypeOf("number");

      expect(insertedEvent).not.toBeNull();
      expect((insertedEvent as Record<string, unknown> | null)?.idempotencyKey).toBe(
        "reminder_loan_abc_2026-11-09"
      );
      expect((insertedEvent as Record<string, unknown> | null)?.status).toBe("processed");
    });

    it("returns alreadyProcessed: true and preserves state upon duplicate delivery", async () => {
      let patchCalled = false;
      let insertCalled = false;

      const existingEvent = {
        _id: "event_existing_999",
        idempotencyKey: "reminder_loan_abc_2026-11-09",
        status: "processed",
      };

      const mockCtx = {
        db: {
          query: () => ({
            withIndex: () => ({
              first: async () => existingEvent, // Found existing!
            }),
          }),
          get: async () => {
            throw new Error("Should not reach get loan");
          },
          patch: async () => {
            patchCalled = true;
          },
          insert: async () => {
            insertCalled = true;
            return "event_should_not_create";
          },
        },
      } as unknown as MutationCtx;

      const result = await handler(mockCtx, {
        loanId: "loan_abc" as unknown as Id<"loans">,
        idempotencyKey: "reminder_loan_abc_2026-11-09",
        deliveredVia: "email",
      });

      expect(result.success).toBe(true);
      expect(result.alreadyProcessed).toBe(true);
      expect(result.eventId).toBe("event_existing_999");
      expect(patchCalled).toBe(false);
      expect(insertCalled).toBe(false);
    });
  });

  describe("Automation Event Observability & Status Tracking", () => {
    it("updates automation event status and attempt count", async () => {
      let patchedData: Record<string, unknown> | null = null;
      const mockEvent = {
        _id: "evt_123" as unknown as Id<"automationEvents">,
        eventType: "request_created",
        resourceId: "req_xyz",
        status: "pending",
        attempts: 0,
        createdAt: 1000,
      };

      const handler = (
        automations.updateAutomationEventStatus as unknown as MutationCallable<
          {
            resourceId: string;
            eventType: string;
            status: "pending" | "processed" | "failed";
            attempts: number;
            error?: string;
          },
          { success: boolean; eventId?: unknown }
        >
      )._handler;

      const mockCtx = {
        db: {
          query: () => ({
            withIndex: () => ({
              collect: async () => [mockEvent],
            }),
          }),
          patch: async (_id: unknown, data: Record<string, unknown>) => {
            patchedData = data;
          },
        },
      } as unknown as MutationCtx;

      const result = await handler(mockCtx, {
        resourceId: "req_xyz",
        eventType: "request_created",
        status: "processed",
        attempts: 1,
      });

      expect(result.success).toBe(true);
      expect(patchedData).not.toBeNull();
      expect((patchedData as Record<string, unknown> | null)?.status).toBe("processed");
      expect((patchedData as Record<string, unknown> | null)?.attempts).toBe(1);
    });
  });

  describe("n8n Workflow JSON File Integrity", () => {
    const workflowsDir = path.join(process.cwd(), "n8n", "workflows");

    it("contains valid request_notification.json workflow", () => {
      const filePath = path.join(workflowsDir, "request_notification.json");
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(content.name).toContain("Borrow Request Notifications");
      expect(content.nodes).toBeInstanceOf(Array);
      expect(content.nodes.some((n: { type: string }) => n.type.includes("webhook"))).toBe(true);
      expect(content.nodes.some((n: { name: string }) => n.name.includes("Verify HMAC"))).toBe(true);
      expect(content.connections).toBeDefined();
    });

    it("contains valid overdue_reminders.json workflow", () => {
      const filePath = path.join(workflowsDir, "overdue_reminders.json");
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(content.name).toContain("Daily Overdue Reminders");
      expect(content.nodes).toBeInstanceOf(Array);
      expect(content.nodes.some((n: { type: string }) => n.type.includes("schedule"))).toBe(true);
      expect(content.nodes.some((n: { name: string }) => n.name.includes("Write-Back"))).toBe(true);
    });

    it("contains valid error_handler.json workflow", () => {
      const filePath = path.join(workflowsDir, "error_handler.json");
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(content.name).toContain("Error Handler");
      expect(content.nodes).toBeInstanceOf(Array);
      expect(content.nodes.some((n: { type: string }) => n.type.includes("errorTrigger"))).toBe(true);
    });
  });
});
