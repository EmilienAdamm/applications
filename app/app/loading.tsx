function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 ${className}`} />
}

export default function Loading() {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-28" />
      </div>

      <div className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SkeletonBlock className="h-6 w-40 rounded-lg" />
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-8 w-48 rounded-lg" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <SkeletonBlock className="h-12 w-full rounded-xl" />
          <SkeletonBlock className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </section>
  )
}
