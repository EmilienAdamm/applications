interface MetricCardProps {
  label: string
  value: string | number
  percentage?: string
  percentageToneClassName?: string
  hoverToneClassName?: string
}

export function MetricCard({
  label,
  value,
  percentage,
  percentageToneClassName,
  hoverToneClassName,
}: MetricCardProps) {
  return (
    <article
      className={`rounded-2xl border border-white/70 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-zinc-900/80 ${hoverToneClassName ?? "hover:bg-zinc-50 dark:hover:bg-zinc-900"}`}
    >
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {percentage ? (
        <p
          className={`mt-1 text-xs font-medium ${percentageToneClassName ?? "text-muted-foreground"}`}
        >
          {percentage}
        </p>
      ) : null}
    </article>
  )
}
