"use client"

import { useEffect, useRef } from "react"

import { cn } from "@/lib/utils"

interface AnimatedStatValueProps {
  value: string | number
  animationKey: number
  className?: string
}

export function AnimatedStatValue({
  value,
  animationKey,
  className,
}: AnimatedStatValueProps) {
  const groupRef = useRef<HTMLSpanElement>(null)
  const valueText = String(value)
  const characters = Array.from(valueText)

  useEffect(() => {
    if (animationKey <= 0) {
      return
    }

    const group = groupRef.current
    if (!group) {
      return
    }

    group.classList.remove("is-animating")
    void group.offsetHeight
    group.classList.add("is-animating")
  }, [animationKey])

  return (
    <span
      ref={groupRef}
      className={cn("t-digit-group", className)}
      aria-label={valueText}
    >
      {characters.map((character, index) => {
        const stagger =
          index === characters.length - 2
            ? 1
            : index === characters.length - 1
              ? 2
              : undefined

        return (
          <span
            key={`${character}-${index}`}
            className="t-digit"
            data-stagger={stagger}
            aria-hidden="true"
          >
            {character}
          </span>
        )
      })}
    </span>
  )
}
