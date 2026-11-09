import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Navbar } from "@/components/layout/Navbar";
import { PublicToolsDirectory } from "@/components/tools/PublicToolsDirectory";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-stone-900">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-radial from-stone-100 to-stone-50 py-20 sm:py-28 lg:py-32">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            {/* Tagline Heading */}
            <h1 className="mx-auto max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight text-stone-900 sm:text-6xl">
              Borrow what you need. <br className="hidden sm:inline" />
              <span className="text-emerald-800">Lend what you don&apos;t.</span>
            </h1>

            {/* Short Product Explanation */}
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-600 sm:text-xl">
              LendLoop connects neighbors to share tools, equipment, and DIY gear. Keep useful tools
              out of storage, avoid single-use purchases, and build a stronger local community.
            </p>

            {/* Hero CTAs */}
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {userId ? (
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full shadow-md sm:w-auto">
                    Go to Your Dashboard
                  </Button>
                </Link>
              ) : (
                <Link href="/sign-in" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full shadow-md sm:w-auto">
                    Sign in to Lend or Borrow
                  </Button>
                </Link>
              )}

              <Link href="#tools" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Explore Tools
                </Button>
              </Link>
            </div>

            {/* Key Value Metrics / Badges */}
            <div className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-6 border-t border-stone-200 pt-10 text-left sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-base text-emerald-800">
                  🌱
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Reduce Waste</h2>
                  <p className="mt-0.5 text-xs text-stone-600">
                    Why buy a tile saw for a weekend project? Borrow from nearby.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-base text-emerald-800">
                  🤝
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Verified Neighbors</h2>
                  <p className="mt-0.5 text-xs text-stone-600">
                    Securely verified community members and trusted lender badges.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-base text-emerald-800">
                  ⚡
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-stone-900">Simple Reservations</h2>
                  <p className="mt-0.5 text-xs text-stone-600">
                    Request dates, pick up locally, and return with automated reminders.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="border-t border-stone-200 bg-white py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <span className="text-xs font-semibold tracking-wider text-emerald-800 uppercase">
                Simple Lifecycle
              </span>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                How LendLoop Works
              </h2>
              <p className="mt-2 text-sm text-stone-600">
                Sharing equipment should be transparent, safe, and effortless.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-sm font-bold text-white">
                  1
                </div>
                <h3 className="text-base font-semibold text-stone-900">List or Discover</h3>
                <p className="mt-2 text-sm text-stone-600">
                  Browse available tools in the public catalog, or snap a photo of unused tools in
                  your shed to share with your neighbors.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-sm font-bold text-white">
                  2
                </div>
                <h3 className="text-base font-semibold text-stone-900">Request & Approve</h3>
                <p className="mt-2 text-sm text-stone-600">
                  Choose a reservation date range. The lender receives an instant notification to
                  approve or decline the loan request.
                </p>
              </div>

              <div className="rounded-xl border border-stone-200/80 bg-stone-50 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-sm font-bold text-white">
                  3
                </div>
                <h3 className="text-base font-semibold text-stone-900">Return & Repeat</h3>
                <p className="mt-2 text-sm text-stone-600">
                  Complete your project, return the equipment on time with automated reminder
                  workflows, and build community trust.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Public Tools Section with Empty State (Convex ready) */}
        <PublicToolsDirectory />
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-xs text-stone-500 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Logo size={24} />
            <span className="font-semibold text-stone-800">LendLoop</span>
            <span>—</span>
            <span>Borrow what you need. Lend what you don&apos;t.</span>
          </div>
          <div>
            <span>Next.js App Router • Clerk • Convex • Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
