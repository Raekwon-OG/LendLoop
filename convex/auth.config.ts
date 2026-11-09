/**
 * Convex Auth Configuration for Clerk Integration
 *
 * Configures Convex to validate JWT tokens issued by Clerk.
 * In production, set CLERK_JWT_ISSUER_DOMAIN in the Convex Dashboard
 * to your Clerk frontend API domain (e.g., https://clerk.yourdomain.com
 * or https://<app-id>.clerk.accounts.dev).
 */
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN ?? "https://placeholder.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
