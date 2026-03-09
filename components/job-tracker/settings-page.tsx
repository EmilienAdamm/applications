"use client"

import { useReducer } from "react"

import { addOption, deleteOption, renameOption } from "@/app/app/actions"
import { AppShell } from "@/components/job-tracker/app-shell"
import { SettingsTab } from "@/components/job-tracker/settings-tab"
import { trackerReducer } from "@/lib/job-tracker/reducer"
import type {
  JobApplication,
  OptionCategory,
  TrackerOptions,
} from "@/lib/job-tracker/types"

interface SettingsPageProps {
  initialApplications: JobApplication[]
  initialOptions: TrackerOptions
}

export function SettingsPage({
  initialApplications,
  initialOptions,
}: SettingsPageProps) {
  const [state, dispatch] = useReducer(trackerReducer, {
    applications: initialApplications,
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
    <AppShell activeTab="settings">
      <SettingsTab
        options={state.options}
        onAddOption={handleAddOption}
        onRenameOption={handleRenameOption}
        onDeleteOption={handleDeleteOption}
      />
    </AppShell>
  )
}
