import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

interface AnalysisCardProps extends ComponentProps<"article"> {
  title: string
  description: string
  children: ReactNode
}

export function AnalysisCard({
  title,
  description,
  className,
  children,
  ...props
}: AnalysisCardProps) {
  return (
    <article
      className={cn(
        "rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80",
        className
      )}
      {...props}
    >
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
      {children}
    </article>
  )
}
