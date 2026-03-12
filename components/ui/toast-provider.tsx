"use client"

import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react"
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
  tone: "success" | "loading" | "error"
}

interface ToastContextValue {
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  loading: (title: string, description?: string) => string
  update: (
    id: string,
    next: {
      title: string
      description?: string
      tone: "success" | "loading" | "error"
    }
  ) => void
  dismiss: (id: string) => void
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

  function scheduleDismiss(id: string) {
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, TOAST_DURATION_MS)
  }

  function pushToast(tone: Toast["tone"], title: string, description?: string) {
    const id = createToastId()

    setToasts((current) => [...current, { id, title, description, tone }])

    if (tone !== "loading") {
      scheduleDismiss(id)
    }

    return id
  }

  function success(title: string, description?: string) {
    pushToast("success", title, description)
  }

  function error(title: string, description?: string) {
    pushToast("error", title, description)
  }

  function loading(title: string, description?: string) {
    return pushToast("loading", title, description)
  }

  function update(
    id: string,
    next: {
      title: string
      description?: string
      tone: "success" | "loading" | "error"
    }
  ) {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, ...next } : toast
      )
    )

    if (next.tone !== "loading") {
      scheduleDismiss(id)
    }
  }

  return (
    <ToastContext.Provider
      value={{
        success,
        error,
        loading,
        update,
        dismiss: dismissToast,
      }}
    >
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex max-w-sm flex-col gap-2 sm:right-6 sm:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur animate-in slide-in-from-right-8 fade-in duration-300 dark:bg-zinc-950/95"
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  toast.tone === "success"
                    ? "mt-0.5 rounded-full bg-emerald-100 p-1 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : toast.tone === "error"
                      ? "mt-0.5 rounded-full bg-red-100 p-1 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                      : "mt-0.5 rounded-full bg-sky-100 p-1 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                }
              >
                {toast.tone === "success" ? (
                  <CheckCircle2 className="size-4" />
                ) : toast.tone === "error" ? (
                  <AlertCircle className="size-4" />
                ) : (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
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
