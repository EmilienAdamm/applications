import { OptionListEditor } from "@/components/job-tracker/option-list-editor"
import { Switch } from "@/components/ui/switch"
import type {
  OptionCategory,
  TrackerSettings,
  TrackerOptions,
} from "@/lib/job-tracker/types"

interface SettingsTabProps {
  options: TrackerOptions
  settings: TrackerSettings
  onAddOption: (category: OptionCategory, value: string, color: string) => Promise<void>
  onRenameOption: (category: OptionCategory, id: string, newValue: string, newColor: string) => Promise<void>
  onDeleteOption: (category: OptionCategory, id: string) => Promise<void>
  onSetDeeperSearch: (enabled: boolean) => Promise<void>
}

export function SettingsTab({
  options,
  settings,
  onAddOption,
  onRenameOption,
  onDeleteOption,
  onSetDeeperSearch,
}: SettingsTabProps) {
  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
        <h2 className="text-xl font-semibold">Settings & Administration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the dropdown options for each field. Changes apply to all your applications.
        </p>
      </header>

      <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-zinc-900/80">
        <div className="flex items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h3 className="text-lg font-semibold">Deeper Search</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Automatically analyze job post links after applications are saved.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="min-w-16 text-sm font-medium text-right">
              {settings.deeperSearchEnabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={settings.deeperSearchEnabled}
              onCheckedChange={(checked) => void onSetDeeperSearch(checked)}
              aria-label="Toggle Deeper Search"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <OptionListEditor
          title="Resume Used options"
          description="Values used in the 'Resume Used' column."
          values={options.cvUsed}
          onAdd={(value, color) => onAddOption("cvUsed", value, color)}
          onRename={(id, newValue, newColor) => onRenameOption("cvUsed", id, newValue, newColor)}
          onDelete={(id) => onDeleteOption("cvUsed", id)}
        />
        <OptionListEditor
          title="Email used options"
          description="Values used in the 'Email used' column."
          values={options.emailUsed}
          onAdd={(value, color) => onAddOption("emailUsed", value, color)}
          onRename={(id, newValue, newColor) => onRenameOption("emailUsed", id, newValue, newColor)}
          onDelete={(id) => onDeleteOption("emailUsed", id)}
        />
        <OptionListEditor
          title="Status options"
          description="Values used in the 'Status' column."
          values={options.status}
          onAdd={(value, color) => onAddOption("status", value, color)}
          onRename={(id, newValue, newColor) => onRenameOption("status", id, newValue, newColor)}
          onDelete={(id) => onDeleteOption("status", id)}
        />
        <OptionListEditor
          title="Final Status options"
          description="Values used in the 'Final Status' column."
          values={options.finalStatus}
          onAdd={(value, color) => onAddOption("finalStatus", value, color)}
          onRename={(id, newValue, newColor) => onRenameOption("finalStatus", id, newValue, newColor)}
          onDelete={(id) => onDeleteOption("finalStatus", id)}
        />
      </div>
    </section>
  )
}
