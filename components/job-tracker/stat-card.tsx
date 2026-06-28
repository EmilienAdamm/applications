import { AnimatedStatValue } from "@/components/job-tracker/animated-stat-value"

interface StatCardProps {
  label: string
  value: string
  hint: string
  valueAnimationKey?: number
}

export function StatCard({
  label,
  value,
  hint,
  valueAnimationKey = 0,
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">
        {valueAnimationKey > 0 ? (
          <AnimatedStatValue value={value} animationKey={valueAnimationKey} />
        ) : (
          value
        )}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </article>
  )
}
