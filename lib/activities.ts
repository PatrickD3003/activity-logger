export type ActivityKind = "machine" | "operator";

export type ActivityDefinition = {
  id: string;
  code: string;
  name: string;
  description: string;
  kind: ActivityKind;
  tone: "run" | "idle" | "stop" | "work" | "break";
};

export type ActivityCatalog = Record<string, ActivityDefinition[]>;

const machineStatusActivities: ActivityDefinition[] = [
  { id: "machine-run", code: "RUN", name: "Machine running", description: "Machine running", kind: "machine", tone: "run" },
  { id: "machine-id", code: "ID", name: "Machine idle", description: "Machine idle", kind: "machine", tone: "idle" },
  { id: "machine-mt", code: "MT", name: "Mechanical stop", description: "Mechanical stop", kind: "machine", tone: "stop" },
  { id: "machine-pw", code: "PW", name: "Power / utility stop", description: "Power / utility stop", kind: "machine", tone: "stop" }
];

const warpingOperatorActivities: ActivityDefinition[] = [
  { id: "warping-idl", code: "IDL", name: "Idle", description: "Operator idle", kind: "operator", tone: "idle" },
  { id: "warping-bc", code: "BC", name: "Beam change", description: "Beam change", kind: "operator", tone: "work" },
  { id: "warping-cr", code: "CR", name: "Creel loading", description: "Creel loading", kind: "operator", tone: "work" },
  { id: "warping-bk", code: "BK", name: "Yarn breakage", description: "Yarn breakage", kind: "operator", tone: "stop" },
  { id: "warping-th", code: "TH", name: "Threading / re-thread", description: "Threading / re-thread", kind: "operator", tone: "work" },
  { id: "warping-qc", code: "QC", name: "Quality check", description: "Quality check", kind: "operator", tone: "work" },
  { id: "warping-cl", code: "CL", name: "Cleaning", description: "Cleaning", kind: "operator", tone: "work" },
  { id: "warping-br", code: "BR", name: "Operator break", description: "Operator break", kind: "operator", tone: "break" },
  { id: "warping-ad", code: "AD", name: "Admin / paperwork", description: "Admin / paperwork", kind: "operator", tone: "idle" }
];

const indigoOperatorActivities: ActivityDefinition[] = [
  { id: "indigo-idl", code: "IDL", name: "Idle", description: "Operator idle", kind: "operator", tone: "idle" },
  { id: "indigo-dy", code: "DY", name: "Dye bath check", description: "Dye bath check", kind: "operator", tone: "work" },
  { id: "indigo-ch", code: "CH", name: "Chemical dosing", description: "Chemical dosing", kind: "operator", tone: "work" },
  { id: "indigo-ox", code: "OX", name: "Oxidation check", description: "Oxidation check", kind: "operator", tone: "work" },
  { id: "indigo-bk", code: "BK", name: "Yarn breakage", description: "Yarn breakage", kind: "operator", tone: "stop" },
  { id: "indigo-qc", code: "QC", name: "Shade / quality check", description: "Shade / quality check", kind: "operator", tone: "work" },
  { id: "indigo-cl", code: "CL", name: "Cleaning", description: "Cleaning", kind: "operator", tone: "work" },
  { id: "indigo-br", code: "BR", name: "Operator break", description: "Operator break", kind: "operator", tone: "break" },
  { id: "indigo-ad", code: "AD", name: "Admin / paperwork", description: "Admin / paperwork", kind: "operator", tone: "idle" }
];

function cloneActivities(activities: ActivityDefinition[]) {
  return activities.map((activity) => ({ ...activity }));
}

export const defaultActivityCatalog: ActivityCatalog = {
  Warping: [...cloneActivities(machineStatusActivities), ...cloneActivities(warpingOperatorActivities)],
  Indigo: [...cloneActivities(machineStatusActivities), ...cloneActivities(indigoOperatorActivities)],
  Sizing: [...cloneActivities(machineStatusActivities), ...cloneActivities(warpingOperatorActivities)],
  Weaving: [...cloneActivities(machineStatusActivities), ...cloneActivities(warpingOperatorActivities)],
  Finishing: [...cloneActivities(machineStatusActivities), ...cloneActivities(warpingOperatorActivities)]
};

export function getDivisions(catalog: ActivityCatalog) {
  return Object.keys(catalog).sort((first, second) => first.localeCompare(second));
}

export function getActivitiesForDivision(catalog: ActivityCatalog, division: string) {
  return catalog[division] ?? [];
}

export function splitActivitiesByKind(activities: ActivityDefinition[]) {
  return {
    machine: activities.filter((activity) => activity.kind === "machine"),
    operator: activities.filter((activity) => activity.kind === "operator")
  };
}

export function normalizeActivityCode(code: string) {
  return code.trim().toUpperCase().slice(0, 8);
}

export function createActivity(input: Omit<ActivityDefinition, "id">): ActivityDefinition {
  return {
    ...input,
    code: normalizeActivityCode(input.code),
    name: input.name.trim(),
    description: input.description.trim() || input.name.trim(),
    id: crypto.randomUUID()
  };
}

export function upsertActivity(catalog: ActivityCatalog, division: string, activity: ActivityDefinition) {
  const currentActivities = catalog[division] ?? [];
  const exists = currentActivities.some((item) => item.id === activity.id);
  const nextActivity = {
    ...activity,
    code: normalizeActivityCode(activity.code),
    name: activity.name.trim(),
    description: activity.description.trim() || activity.name.trim()
  };

  return {
    ...catalog,
    [division]: exists
      ? currentActivities.map((item) => (item.id === activity.id ? nextActivity : item))
      : [...currentActivities, nextActivity]
  };
}

export function deleteActivity(catalog: ActivityCatalog, division: string, activityId: string) {
  return {
    ...catalog,
    [division]: (catalog[division] ?? []).filter((activity) => activity.id !== activityId)
  };
}

export function resetDivisionActivities(catalog: ActivityCatalog, division: string) {
  return {
    ...catalog,
    [division]: cloneActivities(defaultActivityCatalog[division] ?? [])
  };
}
