export interface PeriodicGroup {
  id: string;
  groupId: string;
  groupName: string;
  groupDescription: string;
  status: string;
  periodicity: string;
  entities: number;
  lastScheduledDate: string | null;
  nextRunDate: string | null;
  frequency: number;
  interval: string;
}
