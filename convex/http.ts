import { httpActionGeneric as httpAction, httpRouter } from "convex/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { timingSafeEqual, verifyHmacSignature } from "./lib/hmac";

const http = httpRouter();

/**
 * GET /api/overdue-loans
 *
 * Polled by n8n scheduled daily workflow.
 * Authenticated via Authorization Bearer token matching N8N_WEBHOOK_SECRET.
 * Employs data minimization: returns only necessary borrower and due date info.
 */
http.route({
  path: "/api/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.N8N_WEBHOOK_SECRET ?? "lendloop_n8n_hmac_secret_dev";

    // Validate Bearer token
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing or malformed Authorization header." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!timingSafeEqual(token, secret)) {
      return new Response(JSON.stringify({ error: "Invalid authorization token." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const overdueLoans = await ctx.runQuery(api.automations.getOverdueLoansForAutomation, {});
      return new Response(JSON.stringify(overdueLoans), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      console.error("[HTTP /api/overdue-loans] Error:", err);
      return new Response(
        JSON.stringify({ error: "Failed to fetch overdue loans." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /api/reminder-writeback
 *
 * Called by n8n after an overdue reminder has been dispatched.
 *
 * Two-way Security:
 * - Requires cryptographic HMAC SHA-256 signature in X-LendLoop-Signature header
 * - Or fallback Authorization Bearer token matching N8N_WEBHOOK_SECRET
 * - Prevents replay attacks by checking timestamp freshness (max 15 min drift)
 *
 * Idempotency:
 * - Accepts idempotencyKey to ensure repeated executions do not create duplicate records
 */
http.route({
  path: "/api/reminder-writeback",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const rawBody = await request.text();
    const signature = request.headers.get("X-LendLoop-Signature");
    const timestamp = request.headers.get("X-LendLoop-Timestamp");
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.N8N_WEBHOOK_SECRET ?? "lendloop_n8n_hmac_secret_dev";

    let isAuthorized = false;

    // 1. Check Bearer token
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "").trim();
      if (timingSafeEqual(token, secret)) {
        isAuthorized = true;
      }
    }

    // 2. Check HMAC signature if provided
    if (!isAuthorized && signature) {
      const payloadToVerify = timestamp ? `${timestamp}.${rawBody}` : rawBody;
      const isValidHmac = await verifyHmacSignature(payloadToVerify, secret, signature);

      if (isValidHmac) {
        // Defend against replay attacks: timestamp must be within 15 minutes
        if (timestamp) {
          const sentTime = parseInt(timestamp, 10);
          const now = Date.now();
          if (isNaN(sentTime) || Math.abs(now - sentTime) > 15 * 60 * 1000) {
            return new Response(
              JSON.stringify({ error: "HMAC timestamp expired or invalid." }),
              { status: 401, headers: { "Content-Type": "application/json" } }
            );
          }
        }
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid HMAC signature or Bearer token." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse JSON body
    let bodyData: { loanId?: string; idempotencyKey?: string; deliveredVia?: string };
    try {
      bodyData = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!bodyData.loanId || !bodyData.idempotencyKey) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: 'loanId' and 'idempotencyKey'." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    try {
      const result = await ctx.runMutation(api.automations.recordReminderWriteback, {
        loanId: bodyData.loanId as unknown as Id<"loans">,
        idempotencyKey: bodyData.idempotencyKey,
        deliveredVia: bodyData.deliveredVia,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: unknown) {
      console.error("[HTTP /api/reminder-writeback] Error:", err);
      return new Response(
        JSON.stringify({ error: err instanceof Error ? err.message : "Write-back failed." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

/**
 * POST /api/webhooks/test
 *
 * Utility endpoint for testing two-way HMAC verification with n8n or cURL.
 */
http.route({
  path: "/api/webhooks/test",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const rawBody = await request.text();
    const signature = request.headers.get("X-LendLoop-Signature");
    const secret = process.env.N8N_WEBHOOK_SECRET ?? "lendloop_n8n_hmac_secret_dev";

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing X-LendLoop-Signature header." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const isValid = await verifyHmacSignature(rawBody, secret, signature);
    return new Response(
      JSON.stringify({
        verified: isValid,
        message: isValid ? "Signature verified successfully." : "Invalid signature.",
        timestamp: Date.now(),
      }),
      {
        status: isValid ? 200 : 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
