import { describe, it, expect } from "vitest";
import { formatConvexError } from "../src/lib/errors";

describe("formatConvexError utility", () => {
  it("extracts clean message from exact Convex mutation error with Request ID and handler trace", () => {
    const convexRawError =
      "[CONVEX M(borrowRequests:create)] [Request ID: 51c07d822eb7033c] Server Error Uncaught Error: You cannot borrow your own equipment listing. at handler (../convex/borrowRequests.ts:51:13) Called by client";

    const result = formatConvexError(new Error(convexRawError));
    expect(result).toBe("You cannot borrow your own equipment listing.");
  });

  it("extracts clean message from Convex Uncaught Error string without stack trace", () => {
    const raw = "Server Error Uncaught Error: Tool not found.";
    expect(formatConvexError(new Error(raw))).toBe("Tool not found.");
  });

  it("handles standard Error instances cleanly", () => {
    const error = new Error("Reservation end date must be on or after the start date.");
    expect(formatConvexError(error)).toBe("Reservation end date must be on or after the start date.");
  });

  it("handles string error arguments cleanly", () => {
    const error = "You cannot borrow your own equipment listing.";
    expect(formatConvexError(error)).toBe("You cannot borrow your own equipment listing.");
  });

  it("returns fallback for null, undefined, or empty error values", () => {
    expect(formatConvexError(null)).toBe("An unexpected error occurred. Please try again.");
    expect(formatConvexError(undefined, "Custom fallback")).toBe("Custom fallback");
    expect(formatConvexError("", "Custom fallback")).toBe("Custom fallback");
  });

  it("handles active loan collision error message correctly", () => {
    const raw =
      "[CONVEX M(borrowRequests:create)] Server Error Uncaught Error: This tool is already booked for an active loan during your requested date range. at handler (../convex/borrowRequests.ts:70:13)";
    expect(formatConvexError(new Error(raw))).toBe(
      "This tool is already booked for an active loan during your requested date range."
    );
  });
});

