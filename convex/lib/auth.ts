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

export interface UserRecord {
  _id: string;
  clerkId: string;
  name: string;
  email: string;
  role: "user" | "admin";
  isTrustedLender: boolean;
  createdAt: number;
}

export interface ToolRecord {
  _id: string;
  ownerId: string;
  ownerClerkId: string;
  title: string;
  category: string;
  condition: "Like New" | "Good" | "Fair";
  status: "available" | "borrowed" | "maintenance" | "archived";
}

export interface BorrowRequestRecord {
  _id: string;
  toolId: string;
  requesterId: string;
  requesterClerkId: string;
  ownerId: string;
  ownerClerkId: string;
  startDate: number;
  endDate: number;
  status: "pending" | "approved" | "declined" | "cancelled";
}

export interface LoanRecord {
  _id: string;
  toolId: string;
  borrowRequestId: string;
  lenderId: string;
  lenderClerkId: string;
  borrowerId: string;
  borrowerClerkId: string;
  startDate: number;
  dueDate: number;
  returnedDate?: number;
  status: "active" | "returned" | "overdue";
}

/**
 * Extracts verified Clerk user identity from the Convex context.
 * Returns null if the request is unauthenticated.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<AuthenticatedUserIdentity | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return {
    tokenIdentifier: identity.tokenIdentifier,
    clerkId: identity.subject,
    issuer: identity.issuer,
    email: identity.email,
    name: identity.name,
    phoneNumber: identity.phoneNumber,
    pictureUrl: identity.pictureUrl,
  };
}

/**
 * Asserts that the caller is authenticated via Clerk.
 * Throws an explicit error if called without valid session credentials.
 */
export async function requireAuthenticatedUser(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<AuthenticatedUserIdentity> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) {
    throw new Error("Unauthenticated: A valid Clerk session token is required.");
  }
  return user;
}

/**
 * Retrieves the user record from the Convex `users` table using Clerk ID.
 */
export async function getUserByClerkId(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<UserRecord | null> {
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
    .unique();

  return (user as UserRecord | null) ?? null;
}

/**
 * Retrieves the database record for the currently authenticated Clerk user.
 */
export async function getCurrentUserRecord(
  ctx: QueryCtx | MutationCtx
): Promise<{ authUser: AuthenticatedUserIdentity; userRecord: UserRecord | null } | null> {
  const authUser = await getAuthenticatedUser(ctx);
  if (!authUser) {
    return null;
  }

  const userRecord = await getUserByClerkId(ctx, authUser.clerkId);
  return { authUser, userRecord };
}

/**
 * Asserts that the caller is authenticated AND registered in the `users` table.
 */
export async function requireCurrentUserRecord(
  ctx: QueryCtx | MutationCtx
): Promise<{ authUser: AuthenticatedUserIdentity; userRecord: UserRecord }> {
  const authUser = await requireAuthenticatedUser(ctx);
  const userRecord = await getUserByClerkId(ctx, authUser.clerkId);

  if (!userRecord) {
    throw new Error(
      `Forbidden: User profile for Clerk ID '${authUser.clerkId}' has not been synced to the database.`
    );
  }

  return { authUser, userRecord };
}

/**
 * Verifies that the caller has administrator privileges.
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx
): Promise<{ authUser: AuthenticatedUserIdentity; userRecord: UserRecord }> {
  const { authUser, userRecord } = await requireCurrentUserRecord(ctx);

  if (userRecord.role !== "admin") {
    throw new Error("Forbidden: Administrator privileges required.");
  }

  return { authUser, userRecord };
}

/**
 * Verifies that the caller is either the owner of the tool or an administrator.
 */
export function assertToolOwnerOrAdmin(
  user: UserRecord,
  tool: { ownerId: string; ownerClerkId: string }
): void {
  const isOwner = user._id === tool.ownerId || user.clerkId === tool.ownerClerkId;
  const isAdmin = user.role === "admin";

  if (!isOwner && !isAdmin) {
    throw new Error("Forbidden: You are not authorized to modify this tool listing.");
  }
}

/**
 * Verifies whether a user has permission to view or participate in a borrow request.
 * Allowed parties: Requester, Tool Owner, or Administrator.
 */
export function canAccessBorrowRequest(
  user: UserRecord,
  request: { requesterId: string; requesterClerkId: string; ownerId: string; ownerClerkId: string }
): boolean {
  if (user.role === "admin") return true;
  if (user._id === request.requesterId || user.clerkId === request.requesterClerkId) return true;
  if (user._id === request.ownerId || user.clerkId === request.ownerClerkId) return true;
  return false;
}

/**
 * Verifies whether a user has permission to view or participate in a loan.
 * Allowed parties: Lender, Borrower, or Administrator.
 */
export function canAccessLoan(
  user: UserRecord,
  loan: { lenderId: string; lenderClerkId: string; borrowerId: string; borrowerClerkId: string }
): boolean {
  if (user.role === "admin") return true;
  if (user._id === loan.lenderId || user.clerkId === loan.lenderClerkId) return true;
  if (user._id === loan.borrowerId || user.clerkId === loan.borrowerClerkId) return true;
  return false;
}

/**
 * Pure business rule: Checks if two date ranges overlap.
 * Used to prevent conflicting reservations or double-booking active loans.
 */
export function doDateRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): boolean {
  return startA < endB && endA > startB;
}

/**
 * Checks if a requested reservation interval conflicts with existing active/approved loans.
 */
export function hasOverlappingActiveLoan(
  existingLoans: Array<{ startDate: number; dueDate: number; status: string }>,
  requestedStart: number,
  requestedEnd: number
): boolean {
  return existingLoans.some(
    (loan) =>
      loan.status === "active" &&
      doDateRangesOverlap(loan.startDate, loan.dueDate, requestedStart, requestedEnd)
  );
}
