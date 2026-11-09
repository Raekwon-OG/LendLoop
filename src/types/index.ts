/**
 * LendLoop Core Types & Roles
 */

export type UserRole = "user" | "admin";

export interface UserProfile {
  id: string;
  clerkId: string;
  name: string;
  email: string;
  role: UserRole;
  isTrustedLender?: boolean;
  createdAt: number;
}

export type ToolCategory =
  | "Power Tools"
  | "Hand Tools"
  | "Gardening & Yard"
  | "Ladders & Scaffolding"
  | "Woodworking"
  | "Automotive"
  | "Plumbing"
  | "Cleaning & Pressure Washing"
  | "Other";

export type ToolCondition = "Like New" | "Good" | "Fair";

export type ToolStatus = "available" | "borrowed" | "maintenance" | "archived";

export interface ToolSummary {
  _id: string;
  title: string;
  category: ToolCategory;
  condition: ToolCondition;
  isAvailable: boolean;
  ownerName?: string;
  description?: string;
}
