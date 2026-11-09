import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types";

/**
 * Retrieves the current authenticated user's session data from Clerk server-side.
 */
export async function getAuthSession() {
  return await auth();
}

/**
 * Retrieves the current Clerk User object server-side.
 */
export async function getCurrentUser() {
  return await currentUser();
}

/**
 * Asserts that the request is authenticated.
 * If not authenticated, redirects to the sign-in page.
 */
export async function requireAuth(redirectTo: string = "/sign-in") {
  const session = await auth();
  if (!session.userId) {
    redirect(redirectTo);
  }
  return session;
}

/**
 * Extracts the user role from Clerk session claims, public metadata, or initial admin configuration.
 * Defaults to "user".
 */
export async function getUserRole(): Promise<UserRole> {
  const session = await auth();
  if (!session.userId) {
    return "user";
  }

  // 1. Check role in Clerk public metadata sessionClaims
  const claims = session.sessionClaims as Record<string, unknown> | undefined;
  const metadataRole = (claims?.metadata as { role?: string } | undefined)?.role;
  const directRole = claims?.role as string | undefined;

  if (metadataRole === "admin" || directRole === "admin") {
    return "admin";
  }

  // 2. Check current user object publicMetadata
  const user = await currentUser();
  if (user?.publicMetadata?.role === "admin") {
    return "admin";
  }

  // 3. Check INITIAL_ADMIN_EMAIL env fallback
  const initialAdminEmail = process.env.INITIAL_ADMIN_EMAIL?.trim().toLowerCase();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress?.toLowerCase();
  if (initialAdminEmail && userEmail && initialAdminEmail === userEmail) {
    return "admin";
  }

  return "user";
}

/**
 * Asserts that the current user has administrator privileges.
 * Redirects to dashboard if user is not an admin.
 */
export async function requireAdminUser(redirectTo: string = "/dashboard") {
  await requireAuth();
  const role = await getUserRole();
  if (role !== "admin") {
    redirect(redirectTo);
  }
  return { role };
}
