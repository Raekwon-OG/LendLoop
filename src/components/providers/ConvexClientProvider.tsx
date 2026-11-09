"use client";

import { ReactNode, useMemo } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

interface ConvexClientProviderProps {
  children: ReactNode;
}

/**
 * Connects Convex client state with Clerk authentication.
 * Passes Clerk session auth tokens to Convex functions on every call.
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  const convex = useMemo(() => {
    const url =
      convexUrl && convexUrl.startsWith("http")
        ? convexUrl
        : "https://placeholder-lendloop.convex.cloud";
    return new ConvexReactClient(url);
  }, [convexUrl]);

  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
