"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

function resolveConvexUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();

  // If a valid HTTP URL is provided and does not use an unparseable placeholder
  if (
    envUrl &&
    envUrl.startsWith("http") &&
    !envUrl.includes("example-placeholder") &&
    !envUrl.includes("placeholder-lendloop")
  ) {
    return envUrl;
  }

  // Fallback to a valid Convex Cloud deployment format (<adjective>-<noun>-<digits>)
  // to prevent internal parser fatal errors when environment keys are unpopulated
  return "https://fictional-lendloop-123.convex.cloud";
}

const convex = new ConvexReactClient(resolveConvexUrl());

interface ConvexClientProviderProps {
  children: ReactNode;
}

/**
 * Connects Convex client state with Clerk authentication.
 * Passes Clerk session auth tokens to Convex functions on every call.
 */
export function ConvexClientProvider({ children }: ConvexClientProviderProps) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
