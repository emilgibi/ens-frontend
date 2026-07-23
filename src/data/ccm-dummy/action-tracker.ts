import { ActionTrackerItem } from '@/types/ccm';

export const actionTrackerItems: ActionTrackerItem[] = [
  {
    id: 'act-1',
    alertId: 'a-1',
    action: 'Legal review of insolvency filing',
    assignedTo: 'Legal Team',
    dueDate: '2026-05-20',
    status: 'IN_PROGRESS',
  },
  {
    id: 'act-2',
    alertId: 'a-3',
    action: 'Compliance check on GST filing lapse',
    assignedTo: 'Compliance Team',
    dueDate: '2026-06-08',
    status: 'PENDING',
  },
  {
    id: 'act-3',
    alertId: 'a-8',
    action: 'Vendor validation against sanctions list',
    assignedTo: 'Vendor Risk Team',
    dueDate: '2026-05-06',
    status: 'PENDING',
  },
  {
    id: 'act-4',
    alertId: 'a-5',
    action: 'Risk review of credit downgrade',
    assignedTo: 'Vendor Risk Team',
    dueDate: '2026-06-25',
    status: 'COMPLETED',
  },
  {
    id: 'act-5',
    alertId: 'a-7',
    action: 'Cyber scan remediation follow-up',
    assignedTo: 'Cyber Team',
    dueDate: '2026-04-15',
    status: 'COMPLETED',
  },
];
