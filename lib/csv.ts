import type { ActivityLog, SessionSetup } from "@/lib/types";
import { formatDuration, secondsBetween } from "@/lib/time";

const headers = [
  "Date",
  "Division",
  "Operator",
  "Machine Number",
  "Activity Code",
  "Activity Name",
  "Start Time",
  "End Time",
  "Duration Seconds",
  "Duration Display",
  "Note"
];

function csvCell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function logsToCsv(logs: ActivityLog[], session?: SessionSetup) {
  const rows = logs.map((log) => {
    const duration = log.durationSeconds ?? secondsBetween(log.startTime);
    return [
      session?.shiftDate ?? log.startTime.slice(0, 10),
      log.division,
      log.operatorName,
      log.machineNumber,
      log.activityCode,
      log.activityName,
      log.startTime,
      log.endTime ?? "",
      duration,
      formatDuration(duration),
      log.note
    ].map(csvCell);
  });

  return [headers.map(csvCell), ...rows].map((row) => row.join(",")).join("\n");
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
