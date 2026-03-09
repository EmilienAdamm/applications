"use client"

import { Palette, Pencil, Plus, Trash2, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PRESET_COLORS } from "@/lib/job-tracker/types"
import { getBadgeProps, colorToHex, PRESET_HEX } from "@/lib/job-tracker/value-colors"

// ─── Color Picker Popover ────────────────────────────────────────────────────

interface ColorPickerPopoverProps {
  value: string
  onChange: (color: string) => void
  /** "sm" = h-8/w-8 trigger (edit row), default = h-9/w-9 (add row) */
  size?: "sm" | "default"
}

function ColorPickerPopover({ value, onChange, size = "default" }: ColorPickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  const currentHex = colorToHex(value)
  const isPreset = value in PRESET_HEX

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Pick a colour"
        aria-label="Pick a colour"
        className={cn(
          "flex items-center justify-center rounded-lg border border-zinc-300 transition shrink-0",
          "hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600",
          open && "border-zinc-400 dark:border-zinc-500",
          size === "sm" ? "h-8 w-8" : "h-9 w-9"
        )}
        style={{ color: currentHex }}
      >
        <Palette className="size-4" />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          {/* Preset swatches */}
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Presets
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-label={preset}
                title={preset}
                onClick={() => {
                  onChange(preset)
                  setOpen(false)
                }}
                className={cn(
                  "size-6 rounded-full border-2 transition-transform hover:scale-110",
                  isPreset && value === preset
                    ? "border-foreground scale-110"
                    : "border-transparent"
                )}
                style={{ backgroundColor: PRESET_HEX[preset] }}
              />
            ))}
          </div>

          {/* Custom color */}
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Custom
          </p>
          <input
            type="color"
            value={currentHex}
            onChange={(event) => onChange(event.target.value)}
            className="h-8 w-full cursor-pointer rounded-md border border-zinc-300 p-0.5 dark:border-zinc-700"
          />
        </div>
      )}
    </div>
  )
}

// ─── Option List Editor ──────────────────────────────────────────────────────

interface OptionListEditorProps {
  title: string
  description: string
  values: { id: string; value: string; color: string; sortOrder: number }[]
  onAdd: (value: string, color: string) => void
  onRename: (id: string, newValue: string, newColor: string) => void
  onDelete: (id: string) => void
}

export function OptionListEditor({
  title,
  description,
  values,
  onAdd,
  onRename,
  onDelete,
}: OptionListEditorProps) {
  const [newValue, setNewValue] = useState("")
  const [newColor, setNewColor] = useState("zinc")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [editingColor, setEditingColor] = useState("zinc")
  const canAdd = newValue.trim().length > 0

  function startEdit(option: { id: string; value: string; color: string }) {
    setEditingId(option.id)
    setEditingText(option.value)
    setEditingColor(option.color)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditingText("")
    setEditingColor("zinc")
  }

  function commitEdit(id: string) {
    onRename(id, editingText, editingColor)
    cancelEdit()
  }

  return (
    <article className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
      <div className="mb-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="mb-4 space-y-2">
        {values.map((option) => {
          const isEditing = option.id === editingId
          const { className: badgeClass, style: badgeStyle } = getBadgeProps(option.color)

          return (
            <div
              key={option.id}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/70"
            >
              {isEditing ? (
                /* ── Edit row: text input · color picker · Save · Cancel ── */
                <>
                  <input
                    autoFocus
                    value={editingText}
                    onChange={(event) => setEditingText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitEdit(option.id)
                      if (event.key === "Escape") cancelEdit()
                    }}
                    className="h-8 min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <ColorPickerPopover value={editingColor} onChange={setEditingColor} size="sm" />
                  <Button
                    size="sm"
                    className="h-8 cursor-pointer px-3"
                    onClick={() => commitEdit(option.id)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 cursor-pointer"
                    onClick={cancelEdit}
                    aria-label={`Cancel edit for ${option.value}`}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                /* ── Display row: badge · Edit · Delete ── */
                <>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(badgeClass, "text-sm max-w-full truncate")}
                      style={badgeStyle}
                      title={option.value}
                    >
                      {option.value}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer text-zinc-500 hover:bg-sky-100 hover:text-sky-700 dark:text-zinc-400 dark:hover:bg-sky-950/40 dark:hover:text-sky-300"
                    onClick={() => startEdit(option)}
                    aria-label={`Edit ${option.value}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer text-zinc-500 hover:bg-red-100 hover:text-red-700 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    onClick={() => onDelete(option.id)}
                    disabled={values.length <= 1}
                    aria-label={`Delete ${option.value}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Add row: text input · colour picker icon · Add button */}
      <div className="flex gap-2">
        <input
          value={newValue}
          onChange={(event) => setNewValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canAdd) {
              onAdd(newValue.trim(), newColor)
              setNewValue("")
              setNewColor("zinc")
            }
          }}
          placeholder="Add a value"
          className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-700 dark:bg-zinc-950"
        />
        <ColorPickerPopover value={newColor} onChange={setNewColor} />
        <Button
          size="lg"
          className="cursor-pointer"
          disabled={!canAdd}
          onClick={() => {
            if (!canAdd) return
            onAdd(newValue.trim(), newColor)
            setNewValue("")
            setNewColor("zinc")
          }}
        >
          <Plus className="size-4" />
          Add
        </Button>
      </div>
    </article>
  )
}
