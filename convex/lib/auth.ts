import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

export interface AuthenticatedUserIdentity {
  tokenIdentifier: string;
  clerkId: string;
  issuer: string;
  email?: string;
  name?: string;
  phoneNumber?: string;
  pictureUrl?: string;
}

/**
 * Extracts and returns the verified Clerk user identity from the Convex context.
 * Returns null if the request is unauthenticated.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<AuthenticatedUserIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  // In Clerk JWTs, tokenIdentifier is of the form "<issuer>|<subject>"
  // where subject is the Clerk User ID ("user_...").
  const clerkId = identity.subject;

  return {
    tokenIdentifier: identity.tokenIdentifier,
    clerkId,
    issuer: identity.issuer,
    email: identity.email,
    name: identity.name,
    phoneNumber: identity.phoneNumber,
    pictureUrl: identity.pictureUrl,
  };
}

/**
 * Asserts that the Convex caller is an authenticated Clerk user.
 * Throws an explicit authentication error if called without valid Clerk JWT credentials.
 *
 * NOTE: This verifies identity. Fine-grained authorization (e.g. tool ownership,
 * admin role access control) will be implemented in subsequent phases.
 */
export async function requireAuthenticatedUser(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<AuthenticatedUserIdentity> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) {
    throw new Error(
      "Unauthenticated: A valid Clerk session token is required to perform this action."
    );
  }
  return user;
}
