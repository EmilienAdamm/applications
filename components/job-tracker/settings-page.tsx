"use client"

import dynamic from "next/dynamic"
import { useReducer, useState } from "react"

import {
  addOption,
  deleteOption,
  renameOption,
  updateDeeperSearchPreference,
} from "@/app/app/actions"
import { useToast } from "@/components/ui/toast-provider"
import { trackerReducer } from "@/lib/job-tracker/reducer"
import type {
  OptionCategory,
  TrackerSettings,
  TrackerOptions,
} from "@/lib/job-tracker/types"

const SettingsTab = dynamic(
  () =>
    import("@/components/job-tracker/settings-tab").then((module) => ({
      default: module.SettingsTab,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80" />
        </div>
      </div>
    ),
  }
)

interface SettingsPageProps {
  initialOptions: TrackerOptions
  initialSettings: TrackerSettings
}

function optionCategoryLabel(category: OptionCategory) {
  if (category === "cvUsed") return "Resume Used"
  if (category === "emailUsed") return "Email Used"
  if (category === "finalStatus") return "Final Status"
  return "Status"
}

export function SettingsPage({
  initialOptions,
  initialSettings,
}: SettingsPageProps) {
  const { success } = useToast()
  const [state, dispatch] = useReducer(trackerReducer, {
    applications: [],
    options: initialOptions,
  })
  const [settings, setSettings] = useState(initialSettings)

  async function handleAddOption(
    category: OptionCategory,
    value: string,
    color: string
  ) {
    const option = await addOption(category, value, color)
    dispatch({ type: "add_option", payload: { category, option } })
    success(`${optionCategoryLabel(category)} option added`, option.value)
  }

  async function handleRenameOption(
    category: OptionCategory,
    id: string,
    newValue: string,
    newColor: string
  ) {
    const currentOption = state.options[category].find((option) => option.id === id)
    if (!currentOption) return

    const trimmedValue = newValue.trim()
    if (!trimmedValue) return

    await renameOption(id, trimmedValue, newColor)

    dispatch({
      type: "rename_option",
      payload: {
        category,
        id,
        currentValue: currentOption.value,
        nextValue: trimmedValue,
        nextColor: newColor,
      },
    })

    const label = optionCategoryLabel(category)
    const valueChanged = currentOption.value !== trimmedValue
    const colorChanged = currentOption.color !== newColor

    if (valueChanged && colorChanged) {
      success(`${label} option updated`, `${currentOption.value} -> ${trimmedValue}`)
      return
    }

    if (colorChanged) {
      success(`${label} color updated`, trimmedValue)
      return
    }

    if (valueChanged) {
      success(`${label} option renamed`, `${currentOption.value} -> ${trimmedValue}`)
    }
  }

  async function handleDeleteOption(category: OptionCategory, id: string) {
    const option = state.options[category].find((candidate) => candidate.id === id)
    if (!option) return

    const fallback = await deleteOption(id)
    if (!fallback) return

    dispatch({
      type: "delete_option",
      payload: { category, id, value: option.value },
    })
    success(`${optionCategoryLabel(category)} option deleted`, option.value)
  }

  async function handleSetDeeperSearch(enabled: boolean) {
    const result = await updateDeeperSearchPreference(enabled)
    setSettings(result.settings)

    if (enabled) {
      success(
        "Deeper Search enabled",
        result.queuedApplications > 0
          ? `${result.queuedApplications} existing applications queued for analysis`
          : "New applications will trigger Deeper Search automatically"
      )
      return
    }

    success("Deeper Search disabled")
  }

  return (
    <SettingsTab
      options={state.options}
      settings={settings}
      onAddOption={handleAddOption}
      onRenameOption={handleRenameOption}
      onDeleteOption={handleDeleteOption}
      onSetDeeperSearch={handleSetDeeperSearch}
    />
  )
}
