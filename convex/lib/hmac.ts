/**
 * Cryptographic HMAC SHA-256 helper utilities for two-way Convex <-> n8n security.
 *
 * Implements:
 * - HMAC-SHA256 generation using the standard Web Crypto API (supported natively in Convex & Node)
 * - Constant-time string comparison to prevent side-channel timing attacks
 * - Replay attack prevention via timestamp headers
 */

/**
 * Computes a SHA-256 HMAC signature as a hexadecimal string.
 */
export async function generateHmacSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Constant-time comparison of two strings to prevent timing attack vulnerabilities.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verifies an incoming HMAC-SHA256 signature against payload and shared secret.
 */
export async function verifyHmacSignature(
  payload: string,
  secret: string,
  providedSignature: string
): Promise<boolean> {
  if (!providedSignature || !secret) {
    return false;
  }

  const expectedSignature = await generateHmacSignature(payload, secret);
  return timingSafeEqual(expectedSignature.toLowerCase(), providedSignature.trim().toLowerCase());
}

/**
 * Generates signature headers for outgoing webhooks from Convex to n8n.
 * Includes timestamp to defend against replay attacks.
 */
export async function createSignedWebhookHeaders(
  payload: string,
  secret: string
): Promise<Record<string, string>> {
  const timestamp = Date.now().toString();
  // Sign timestamp + payload to bind them together
  const signedPayload = `${timestamp}.${payload}`;
  const signature = await generateHmacSignature(signedPayload, secret);

  return {
    "Content-Type": "application/json",
    "X-LendLoop-Signature": signature,
    "X-LendLoop-Timestamp": timestamp,
  };
}

