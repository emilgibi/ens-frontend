import { z } from 'zod';

import { scheduleMonitoring } from '@/drizzle/schema';

export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Enter a valid email' })
    .trim(),
  password: z.string().min(1, { message: 'Password is required' }).trim(),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

export type PeriodicMonitoringConfig = typeof scheduleMonitoring.$inferSelect;

export const periodicMonitoringFormSchema = z.object({
  groupName: z.string().min(1, { message: 'Group name is required' }).trim(),
  groupDescription: z
    .string()
    .min(3, { message: 'Group description is required' })
    .trim(),
  status: z.string(),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  frequency: z.number(),
  interval: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR']),
});

export type PeriodicMonitoringFormData = z.infer<
  typeof periodicMonitoringFormSchema
>;
