"use client";

import { useMemo, useState } from "react";
import {
  createActivity,
  deleteActivity,
  getDivisions,
  resetDivisionActivities,
  splitActivitiesByKind,
  upsertActivity,
  type ActivityCatalog,
  type ActivityDefinition,
  type ActivityKind
} from "@/lib/activities";

type Props = {
  catalog: ActivityCatalog;
  currentDivision: string;
  onChange: (catalog: ActivityCatalog) => void;
  onClose?: () => void;
};

const emptyForm = {
  id: "",
  code: "",
  name: "",
  description: "",
  kind: "operator" as ActivityKind,
  tone: "work" as ActivityDefinition["tone"]
};

const toneOptions: ActivityDefinition["tone"][] = ["run", "idle", "stop", "work", "break"];

export function ActivityManager({ catalog, currentDivision, onChange, onClose }: Props) {
  const divisions = useMemo(() => getDivisions(catalog), [catalog]);
  const [selectedDivision, setSelectedDivision] = useState(currentDivision);
  const [form, setForm] = useState<ActivityDefinition>(emptyForm);

  const selectedActivities = catalog[selectedDivision] ?? [];
  const groupedActivities = splitActivitiesByKind(selectedActivities);
  const isEditing = Boolean(form.id);

  function updateField<Key extends keyof ActivityDefinition>(key: Key, value: ActivityDefinition[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(formData: FormData) {
    const code = String(formData.get("code") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const kind = String(formData.get("kind") ?? "operator") as ActivityKind;
    const tone = String(formData.get("tone") ?? "work") as ActivityDefinition["tone"];
    const description = String(formData.get("description") ?? "").trim();

    if (!code || !name) return;
    const duplicateCode = selectedActivities.some(
      (activity) => activity.code.toUpperCase() === code.toUpperCase() && activity.id !== form.id
    );
    if (duplicateCode) {
      window.alert(`Activity code ${code.toUpperCase()} already exists for ${selectedDivision}.`);
      return;
    }

    const nextActivity = form.id
      ? { ...form, code, name, description, kind, tone }
      : createActivity({ code, name, description, kind, tone });

    onChange(upsertActivity(catalog, selectedDivision, nextActivity));
    setForm(emptyForm);
  }

  function editActivity(activity: ActivityDefinition) {
    setForm(activity);
  }

  function removeActivity(activity: ActivityDefinition) {
    const confirmed = window.confirm(`Delete ${activity.code} - ${activity.name}?`);
    if (!confirmed) return;
    onChange(deleteActivity(catalog, selectedDivision, activity.id));
    if (form.id === activity.id) setForm(emptyForm);
  }

  function resetDivision() {
    const confirmed = window.confirm(`Reset ${selectedDivision} activities to defaults?`);
    if (!confirmed) return;
    onChange(resetDivisionActivities(catalog, selectedDivision));
    setForm(emptyForm);
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">Activity CRUD</h2>
          <p className="mt-1 text-sm text-muted">Create, update, and delete activity buttons separately for each division.</p>
        </div>
        {onClose ? (
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-3 text-sm font-semibold text-muted">
            Back
          </button>
        ) : null}
      </div>

      <label className="mt-4 block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">Division activity list</span>
        <select
          value={selectedDivision}
          onChange={(event) => {
            setSelectedDivision(event.target.value);
            setForm(emptyForm);
          }}
          className="h-12 w-full rounded-md border border-line bg-panelSoft px-3 text-base font-semibold text-ink outline-none focus:border-info"
        >
          {divisions.map((division) => (
            <option key={division}>{division}</option>
          ))}
        </select>
      </label>

      <form action={handleSubmit} className="mt-4 grid gap-3 rounded-lg border border-line bg-[#0b0f16] p-3">
        <h3 className="text-sm font-semibold text-ink">{isEditing ? "Update selected activity" : "Create new activity"}</h3>
        <div className="grid grid-cols-[5.25rem_1fr] gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Code</span>
            <input
              name="code"
              required
              value={form.code}
              onChange={(event) => updateField("code", event.target.value.toUpperCase())}
              placeholder="QC"
              className="h-11 w-full rounded-md border border-line bg-panelSoft px-3 text-sm font-bold text-ink outline-none placeholder:text-slate-600 focus:border-info"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Activity name</span>
            <input
              name="name"
              required
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Quality check"
              className="h-11 w-full rounded-md border border-line bg-panelSoft px-3 text-sm text-ink outline-none placeholder:text-slate-600 focus:border-info"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Description</span>
          <input
            name="description"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Shown in exports and admin review"
            className="h-11 w-full rounded-md border border-line bg-panelSoft px-3 text-sm text-ink outline-none placeholder:text-slate-600 focus:border-info"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Group</span>
            <select
              name="kind"
              value={form.kind}
              onChange={(event) => updateField("kind", event.target.value as ActivityKind)}
              className="h-11 w-full rounded-md border border-line bg-panelSoft px-3 text-sm text-ink outline-none focus:border-info"
            >
              <option value="machine">Machine status</option>
              <option value="operator">Operator activity</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">Tone</span>
            <select
              name="tone"
              value={form.tone}
              onChange={(event) => updateField("tone", event.target.value as ActivityDefinition["tone"])}
              className="h-11 w-full rounded-md border border-line bg-panelSoft px-3 text-sm text-ink outline-none focus:border-info"
            >
              {toneOptions.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-3">
          <button type="submit" className="h-11 rounded-md bg-action text-sm font-bold text-slate-950">
            {isEditing ? "Update activity" : "Create activity"}
          </button>
          <button
            type="button"
            onClick={() => setForm(emptyForm)}
            className="h-11 rounded-md border border-line px-4 text-sm font-bold text-muted"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-4">
        <ActivityList title="Machine status" activities={groupedActivities.machine} onEdit={editActivity} onDelete={removeActivity} />
        <ActivityList title="Operator activity" activities={groupedActivities.operator} onEdit={editActivity} onDelete={removeActivity} />
      </div>

      <button type="button" onClick={resetDivision} className="mt-4 h-10 w-full rounded-md border border-danger/60 text-sm font-bold text-red-300">
        Reset {selectedDivision} defaults
      </button>
    </section>
  );
}

function ActivityList({
  title,
  activities,
  onEdit,
  onDelete
}: {
  title: string;
  activities: ActivityDefinition[];
  onEdit: (activity: ActivityDefinition) => void;
  onDelete: (activity: ActivityDefinition) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted">{title}</h3>
      <div className="grid gap-2">
        {activities.length === 0 ? (
          <p className="rounded-md border border-line bg-panelSoft px-3 py-3 text-sm text-muted">No activities configured.</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="grid grid-cols-[3.75rem_1fr_auto] items-center gap-2 rounded-md border border-line bg-panelSoft p-2">
              <span className="rounded bg-[#0b0f16] px-2 py-2 text-center text-sm font-black text-ink">{activity.code}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{activity.name}</p>
                <p className="truncate text-xs text-muted">{activity.tone}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onEdit(activity)} className="h-9 rounded-md border border-line px-3 text-xs font-bold text-info">
                  Update
                </button>
                <button type="button" onClick={() => onDelete(activity)} className="h-9 rounded-md border border-danger/60 px-3 text-xs font-bold text-red-300">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
