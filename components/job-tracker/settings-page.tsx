"use client"

import dynamic from "next/dynamic"
import { useReducer } from "react"

import { addOption, deleteOption, renameOption } from "@/app/app/actions"
import { trackerReducer } from "@/lib/job-tracker/reducer"
import type {
  OptionCategory,
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
}

export function SettingsPage({
  initialOptions,
}: SettingsPageProps) {
  const [state, dispatch] = useReducer(trackerReducer, {
    applications: [],
    options: initialOptions,
  })

  async function handleAddOption(
    category: OptionCategory,
    value: string,
    color: string
  ) {
    const option = await addOption(category, value, color)
    dispatch({ type: "add_option", payload: { category, option } })
  }

  async function handleRenameOption(
    category: OptionCategory,
    id: string,
    newValue: string,
    newColor: string
  ) {
    const currentOption = state.options[category].find((option) => option.id === id)
    if (!currentOption) return

    dispatch({
      type: "rename_option",
      payload: {
        category,
        id,
        currentValue: currentOption.value,
        nextValue: newValue,
        nextColor: newColor,
      },
    })
    await renameOption(id, newValue, newColor)
  }

  async function handleDeleteOption(category: OptionCategory, id: string) {
    const option = state.options[category].find((candidate) => candidate.id === id)
    if (!option) return

    dispatch({
      type: "delete_option",
      payload: { category, id, value: option.value },
    })
    await deleteOption(id)
  }

  return (
    <SettingsTab
      options={state.options}
      onAddOption={handleAddOption}
      onRenameOption={handleRenameOption}
      onDeleteOption={handleDeleteOption}
    />
  )
}
