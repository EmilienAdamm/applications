"use client"

import { CheckCircle2, X } from "lucide-react"
import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react"

interface Toast {
  id: string
  title: string
  description?: string
}

interface ToastContextValue {
  success: (title: string, description?: string) => void
}

const TOAST_DURATION_MS = 3200

const ToastContext = createContext<ToastContextValue | null>(null)

function createToastId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  function dismissToast(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  function success(title: string, description?: string) {
    const id = createToastId()

    setToasts((current) => [...current, { id, title, description }])

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, TOAST_DURATION_MS)
  }

  return (
    <ToastContext.Provider value={{ success }}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex max-w-sm flex-col gap-2 sm:right-6 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto rounded-2xl border border-emerald-200 bg-white/95 p-4 shadow-lg shadow-emerald-950/10 backdrop-blur animate-in slide-in-from-right-8 fade-in duration-300 dark:border-emerald-900/60 dark:bg-zinc-950/95"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {toast.title}
                </p>
                {toast.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {toast.description}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="rounded-md p-1 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }

  return context
}
