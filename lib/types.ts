export type SessionSetup = {
  sessionId: string;
  division: string;
  operatorName: string;
  operators?: string[];
  machineNumber: string;
  shiftDate: string;
  shiftName: string;
  createdBy: string;
};

export type ActivityLog = {
  logId: string;
  sessionId: string;
  division: string;
  operatorName: string;
  machineNumber: string;
  activityCode: string;
  activityName: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  note: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

export type LogInput = Omit<ActivityLog, "logId" | "createdAt" | "updatedAt"> & {
  logId?: string;
};
