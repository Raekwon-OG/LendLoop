# LendLoop 🛠️

> **"Borrow what you need. Lend what you don't."**

LendLoop is a neighborhood equipment-sharing cooperative built as a modern, full-stack application. It allows neighbors to borrow tools for weekend DIY tasks, home repairs, or lawn care, while enabling owners to share underutilized gear in a safe, accountable community circle.

---

## Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React Server Components)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Authentication**: [Clerk](https://clerk.com/) (`@clerk/nextjs`)
- **Database & Backend**: [Convex](https://www.convex.dev/) (`convex`)
- **Validation**: [Zod](https://zod.dev/)
- **Code Quality**: ESLint 9 & Prettier
- **Automation** _(Upcoming)_: n8n workflow engine orchestrated with Docker Compose

---

## User Roles

LendLoop supports two primary roles:

1. **User (`user`)**:
   - Browse public tool directory.
   - List personal tools with condition, category, and availability.
   - Request tool reservations with date ranges.
   - Manage outgoing borrowing requests and incoming loan approvals.
2. **Admin (`admin`)**:
   - Everything available to standard users.
   - Moderate and remove any tool listing across the community.
   - Inspect global loan activity and audit history.
   - Designate and manage "Trusted Lender" community badges.

---

## Project Structure

```text
├── convex/                          # Convex backend functions and configuration
│   ├── _generated/                  # Generated Convex server types and API descriptors
│   ├── auth.config.ts               # Clerk JWT authentication integration config
│   ├── health.ts                    # Backend connectivity and health check query
│   ├── schema.ts                    # Initial schema definition and table foundations
│   └── lib/
│       └── auth.ts                  # Convex identity extraction and caller verification
├── n8n/                             # Automation workflows and local infra
│   └── workflows/                   # n8n workflow JSON templates (Phase 7)
├── public/                          # Static assets and icons
├── src/
│   ├── app/                         # Next.js App Router routes
│   │   ├── (auth)/                  # Clerk authentication routes (/sign-in, /sign-up)
│   │   ├── (dashboard)/             # Protected application dashboard shell
│   │   │   └── dashboard/           # Dashboard home, tools, listings, requests, admin
│   │   ├── globals.css              # Tailwind styling and brand theme tokens
│   │   ├── layout.tsx               # Root layout (ClerkProvider + ConvexClientProvider)
│   │   └── page.tsx                 # Public LendLoop landing page
│   ├── components/
│   │   ├── layout/                  # Shared layouts (Navbar, DashboardNav)
│   │   ├── providers/               # ConvexClientProvider with Clerk auth
│   │   ├── tools/                   # Tool catalog components & empty state
│   │   ├── requests/                # Borrow request components (Phase 5)
│   │   └── ui/                      # Reusable UI primitives (Button, Badge, Card)
│   ├── hooks/                       # Custom React hooks
│   ├── lib/
│   │   ├── auth.ts                  # Server-side Clerk authentication helpers
│   │   └── env.ts                   # Type-safe environment variable validation with Zod
│   ├── middleware.ts                # Clerk authentication route matcher and protection
│   └── types/
│       └── index.ts                 # Domain entity types, roles, and categories
├── Phases.MD                        # Roadmap and phase breakdown
├── .env.example                     # Sample environment variable template
├── package.json                     # Project manifest and scripts
└── tsconfig.json                    # Strict TypeScript configuration
```

---

## Prerequisites

Ensure you have the following installed locally:

- **Node.js**: `v20.x` or higher (verified on Node `v20.20.0`)
- **npm**: `v10.x` or higher
- **Git**
- A free account on [Clerk](https://clerk.com/)
- A free account on [Convex](https://www.convex.dev/)
- Docker & Docker Compose _(required for Phase 7 n8n integration)_

---

## Local Installation

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd LendLoop
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env.local
   ```

---

## Environment Variables

Edit `.env.local` and populate the required keys:

| Variable                              | Description                                              | Source           |
| :------------------------------------ | :------------------------------------------------------- | :--------------- |
| `NEXT_PUBLIC_APP_URL`                 | Base application URL (`http://localhost:3000`)           | Local            |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | Clerk Publishable Key (`pk_test_...`)                    | Clerk Dashboard  |
| `CLERK_SECRET_KEY`                    | Clerk Secret Key (`sk_test_...`)                         | Clerk Dashboard  |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`       | Route for sign-in (`/sign-in`)                           | Default          |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`       | Route for sign-up (`/sign-up`)                           | Default          |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Route after sign-in (`/dashboard`)                       | Default          |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Route after sign-up (`/dashboard`)                       | Default          |
| `NEXT_PUBLIC_CONVEX_URL`              | Convex deployment URL (`https://<project>.convex.cloud`) | `npx convex dev` |
| `CONVEX_DEPLOYMENT`                   | Deployment target (`dev:<project>`)                      | `npx convex dev` |

---

## External Service Configuration

### 1. Clerk Authentication Setup

1. Go to the [Clerk Dashboard](https://dashboard.clerk.com/) and create an application named **LendLoop**.
2. Select **Email** and/or **Google** as authentication providers.
3. Copy the **Publishable Key** and **Secret Key** into `.env.local`.
4. In Clerk Dashboard under **Configure > Paths**, verify:
   - Sign-in path: `/sign-in`
   - Sign-up path: `/sign-up`
5. **Role-Based Access Control**:
   - Assign roles (`user` or `admin`) via user `publicMetadata`.
   - Example user metadata:
     ```json
     {
       "role": "admin"
     }
     ```
6. **JWT Template for Convex**:
   - In Clerk Dashboard, navigate to **Configure > JWT Templates**.
   - Click **New template** and choose **Convex**.
   - Keep the default template name: `convex`.
   - Copy your Clerk **Issuer URL** (e.g., `https://<your-app>.clerk.accounts.dev`).

### 2. Convex Backend Setup

1. Initialize your Convex deployment by running:
   ```bash
   npx convex dev
   ```
2. Log in and create or select a Convex project named **lendloop**.
3. Convex will automatically populate `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` in your `.env.local`.
4. Open the [Convex Dashboard](https://dashboard.convex.dev/), select your project, go to **Settings > Environment Variables**, and add:
   - `CLERK_JWT_ISSUER_DOMAIN`: Your Clerk Issuer domain (from step 1.6, without trailing slash).

---

## Running the Application

### Development Server

Start the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Quality and Verification Scripts

- **Run tests**:
  ```bash
  npm test
  ```
- **Type check**:
  ```bash
  npm run type-check
  ```
- **Lint check**:
  ```bash
  npm run lint
  ```
- **Format code**:
  ```bash
  npm run format
  ```
- **Check formatting**:
  ```bash
  npm run format:check
  ```
- **Production build**:
  ```bash
  npm run build
  ```

---

## Implementation Status & Roadmap

| Phase       | Description                                                                           | Status           |
| :---------- | :------------------------------------------------------------------------------------ | :--------------- |
| **Phase 0** | **Project foundation & initial UI** (Next.js, Clerk, Convex, Tailwind, landing page)  | ✅ **Completed** |
| **Phase 1** | **Data model & backend architecture** (Schema, indexes, authorization helpers)        | ✅ **Completed** |
| **Phase 2** | **Authentication & user sync** (Clerk-to-Convex synchronization, user profiles, RBAC) | ✅ **Completed** |
| **Phase 3** | **Public tools directory** (Landing page Convex integration, category browsing)       | ✅ **Completed** |
| **Phase 4** | **Tool listings** (Create/edit/delete tools, ownership enforcement)                   | ⏳ Next          |
| **Phase 5** | **Borrowing lifecycle** (Date reservations, request queues, active loans, returns)    | 📋 Planned       |
| **Phase 6** | **Admin and RBAC** (Moderation, loan audits, Trusted Lender designation)              | 📋 Planned       |
| **Phase 7** | **n8n integration** (Docker Compose, HMAC webhooks, overdue notifications)            | 📋 Planned       |
| **Phase 8** | **Reliability & observability** (Idempotency, retries, failure handling, audit logs)  | 📋 Planned       |
| **Phase 9** | **Testing, polish & delivery** (End-to-end audit, accessibility, final submission)    | 📋 Planned       |
