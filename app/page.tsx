import Link from "next/link"
import { BriefcaseBusiness } from "lucide-react"

import { HeroSection } from "@/components/blocks/hero-section-9"
import { ThemeProvider } from "@/components/theme-provider"

export default function LandingPage() {
  return (
    <ThemeProvider forcedTheme="dark" enableSystem={false} enableHotkey={false}>
      <main className="relative min-h-screen overflow-x-clip bg-zinc-950 text-zinc-100">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-28 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-rose-300/20 blur-3xl" />
          <div className="absolute top-20 -left-24 h-72 w-72 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="absolute top-36 -right-24 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
        </div>

        <header className="sticky top-4 z-30 pt-4">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between rounded-2xl border border-white/15 bg-zinc-900/80 px-4 shadow-2xl backdrop-blur-xl">
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                <BriefcaseBusiness className="size-4" />
              </span>
              Job Tracker
            </Link>

            <Link
              href="/app"
              className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-zinc-900 transition hover:bg-zinc-200"
            >
              Access dashboard
            </Link>
          </div>
        </header>

        <div className="relative">
          <HeroSection hideNav />
        </div>
      </main>
    </ThemeProvider>
  )
}
