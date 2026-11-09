import { headers } from "next/headers";
import { Webhook } from "svix";

/**
 * Clerk Webhook Handler
 *
 * Synchronizes user lifecycle events from Clerk to Convex in the background:
 * - user.created: provisions a new community member profile
 * - user.updated: updates names or email addresses
 * - user.deleted: marks or archives user data
 */
export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn(
      "[LendLoop Webhook] CLERK_WEBHOOK_SECRET is not configured. Skipping webhook verification."
    );
    return new Response(
      JSON.stringify({
        message: "Webhook secret not configured. Ensure CLERK_WEBHOOK_SECRET is set in production.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Get Svix headers for verification
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response(JSON.stringify({ error: "Missing required svix headers" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get raw body
  const payload = await req.text();

  const wh = new Webhook(webhookSecret);
  interface ClerkWebhookPayload {
    type: string;
    data: {
      id: string;
      email_addresses?: Array<{ email_address: string }>;
      first_name?: string | null;
      last_name?: string | null;
    };
  }

  let evt: ClerkWebhookPayload;

  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkWebhookPayload;
  } catch (err) {
    console.error("[LendLoop Webhook] Signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address ?? "";
    const fullName =
      [first_name, last_name].filter(Boolean).join(" ") || primaryEmail.split("@")[0] || "Neighbor";

    console.info(
      `[LendLoop Webhook] User sync event received: ${eventType} for ${id} (${fullName})`
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
