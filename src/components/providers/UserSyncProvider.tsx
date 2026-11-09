"use client";

import React, { useEffect, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

/**
 * Automatically synchronizes authenticated Clerk users with Convex.
 * Ensures the Convex `users` record exists as soon as a user signs in.
 */
export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const syncUserMutation = useMutation(api.users.syncUser);
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && user && syncedRef.current !== user.id) {
      syncedRef.current = user.id;
      syncUserMutation({
        preferredName: user.fullName || user.username || undefined,
      }).catch((err) => {
        console.error("[UserSyncProvider] Error synchronizing user with Convex:", err);
        syncedRef.current = null; // Allow retry on failure
      });
    }
  }, [isLoaded, isSignedIn, user, syncUserMutation]);

  return <>{children}</>;
}
