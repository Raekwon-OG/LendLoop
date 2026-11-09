import { describe, expect, it } from "vitest";
import type { QueryCtx } from "../convex/_generated/server";

interface IndexQueryMock {
  eq: (field: string, val: string) => IndexQueryMock;
}

interface QueryCallable<TArgs, TResult> {
  _handler: (ctx: QueryCtx, args: TArgs) => Promise<TResult>;
}

describe("Phase 3: Public Tools Directory Queries", () => {
  const mockToolsDatabase = [
    {
      _id: "tool_1",
      ownerId: "user_1",
      ownerClerkId: "clerk_1",
      title: "DeWalt 20V Cordless Drill",
      description: "Includes two 2.0Ah batteries and hard carry case.",
      category: "Power Tools",
      condition: "Like New",
      status: "available",
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
    {
      _id: "tool_2",
      ownerId: "user_2",
      ownerClerkId: "clerk_2",
      title: "Heavy Duty Wheelbarrow",
      description: "6 cu. ft. contractor wheelbarrow with pneumatic tire.",
      category: "Gardening & Yard",
      condition: "Good",
      status: "available",
      createdAt: 1700001000000,
      updatedAt: 1700001000000,
    },
    {
      _id: "tool_3",
      ownerId: "user_1",
      ownerClerkId: "clerk_1",
      title: "Table Saw with Stand",
      description: "10-inch portable jobsite table saw.",
      category: "Woodworking",
      condition: "Good",
      status: "borrowed", // Borrowed: Should NOT appear in public available list
      createdAt: 1700002000000,
      updatedAt: 1700002000000,
    },
    {
      _id: "tool_4",
      ownerId: "user_3",
      ownerClerkId: "clerk_3",
      title: "Pressure Washer 3100 PSI",
      description: "Gas powered pressure washer with 25ft hose.",
      category: "Cleaning & Pressure Washing",
      condition: "Fair",
      status: "maintenance", // In maintenance: Should NOT appear in public list
      createdAt: 1700003000000,
      updatedAt: 1700003000000,
    },
  ];

  it("should return only tools with status 'available'", async () => {
    const mockCtx = {
      db: {
        query: () => ({
          withIndex: (_indexName: string, queryBuilder: (q: IndexQueryMock) => IndexQueryMock) => {
            let filterStatus = "";
            const q = {
              eq: (_field: string, val: string) => {
                filterStatus = val;
                return q;
              },
            };
            queryBuilder(q);

            return {
              collect: async () => mockToolsDatabase.filter((t) => t.status === filterStatus),
            };
          },
        }),
      },
    } as unknown as QueryCtx;

    const { getAvailable } = await import("../convex/tools");
    const callable = getAvailable as unknown as QueryCallable<
      { category?: string },
      Array<Record<string, unknown>>
    >;
    const results = await callable._handler(mockCtx, {});

    expect(results).toHaveLength(2);
    expect(results.map((r) => r._id)).toEqual(["tool_1", "tool_2"]);
    expect(results.every((r) => r.isAvailable === true)).toBe(true);
  });

  it("should filter available tools by category", async () => {
    const mockCtx = {
      db: {
        query: () => ({
          withIndex: (_indexName: string, queryBuilder: (q: IndexQueryMock) => IndexQueryMock) => {
            let filterStatus = "";
            let filterCategory = "";
            const q = {
              eq: (field: string, val: string) => {
                if (field === "status") filterStatus = val;
                if (field === "category") filterCategory = val;
                return q;
              },
            };
            queryBuilder(q);

            return {
              collect: async () =>
                mockToolsDatabase.filter(
                  (t) => t.status === filterStatus && t.category === filterCategory
                ),
            };
          },
        }),
      },
    } as unknown as QueryCtx;

    const { getAvailable } = await import("../convex/tools");
    const callable = getAvailable as unknown as QueryCallable<
      { category?: string },
      Array<Record<string, unknown>>
    >;
    const results = await callable._handler(mockCtx, { category: "Power Tools" });

    expect(results).toHaveLength(1);
    expect(results[0]?.title).toBe("DeWalt 20V Cordless Drill");
    expect(results[0]?.category).toBe("Power Tools");
  });

  it("should omit private owner clerkId or contact details from public projection", async () => {
    const mockCtx = {
      db: {
        query: () => ({
          withIndex: () => ({
            collect: async () => mockToolsDatabase.filter((t) => t.status === "available"),
          }),
        }),
      },
    } as unknown as QueryCtx;

    const { getAvailable } = await import("../convex/tools");
    const callable = getAvailable as unknown as QueryCallable<
      { category?: string },
      Array<Record<string, unknown>>
    >;
    const results = await callable._handler(mockCtx, {});

    results.forEach((tool) => {
      expect(tool).toHaveProperty("_id");
      expect(tool).toHaveProperty("title");
      expect(tool).toHaveProperty("category");
      expect(tool).toHaveProperty("condition");
      expect(tool).toHaveProperty("isAvailable");
      // Public view MUST NOT leak owner clerkId
      expect(tool).not.toHaveProperty("ownerClerkId");
      expect(tool).not.toHaveProperty("ownerEmail");
    });
  });

  it("should aggregate categories and counts for available equipment", async () => {
    const mockCtx = {
      db: {
        query: () => ({
          withIndex: () => ({
            collect: async () => mockToolsDatabase.filter((t) => t.status === "available"),
          }),
        }),
      },
    } as unknown as QueryCtx;

    const { getAvailableCategories } = await import("../convex/tools");
    const callable = getAvailableCategories as unknown as QueryCallable<
      Record<string, never>,
      Array<{ name: string; count: number }>
    >;
    const categories = await callable._handler(mockCtx, {});

    expect(categories).toEqual([
      { name: "Power Tools", count: 1 },
      { name: "Gardening & Yard", count: 1 },
    ]);
  });
});
