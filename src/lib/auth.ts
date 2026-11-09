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
 * Extracts the user role from Clerk session claims or public metadata.
 * Defaults to "user".
 */
export async function getUserRole(): Promise<UserRole> {
  const session = await auth();
  if (!session.userId) {
    return "user";
  }

  // Check role in Clerk public metadata (sessionClaims?.metadata or session.sessionClaims)
  const role = (session.sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (role === "admin") {
    return "admin";
  }

  return "user";
}
