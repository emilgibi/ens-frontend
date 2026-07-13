// @ts-nocheck
'use server';

import { db } from '@/db';
import { scheduleMonitoring, ensScheduleGroupMapping } from '@/drizzle/schema';
import { count, eq, inArray } from 'drizzle-orm';
import { periodicMonitoringFormSchema } from '@/lib/definitions';
import { z } from 'zod';
import { getEnsIdsByGroupId } from '@/lib/dal';

export async function periodicMonitoringConfiguration(
  formData: z.infer<typeof periodicMonitoringFormSchema> & {
    selectedEntities: { ensId: string; isActive: boolean }[];
    groupId?: string;
  },
) {
  try {
    const { selectedEntities, groupId, ...configData } = formData;
    console.log('Periodic Monitoring Data Received:', formData);
    if (groupId !== 'new') {
      await db
        .update(scheduleMonitoring)
        .set({
          groupName: configData.groupName,
          groupDescription: configData.groupDescription,
          status: configData.status.toUpperCase(),
          startDate: configData.startDate.toISOString(),
          frequency: configData.frequency,
          interval: configData.interval,
          updateTime: new Date().toISOString(),
          nextRunDate: configData.startDate.toISOString(),
        })
        .where(eq(scheduleMonitoring.groupId, groupId as string));

      if (selectedEntities.length > 0) {
        await updateEntityMappings(groupId as string, selectedEntities);
      }
    } else {
      const newGroupId = crypto.randomUUID();

      await db.insert(scheduleMonitoring).values({
        groupId: newGroupId,
        groupName: configData.groupName,
        groupDescription: configData.groupDescription,
        status: configData.status.toUpperCase(),
        startDate: configData.startDate.toISOString(),
        frequency: configData.frequency,
        interval: configData.interval,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        nextRunDate: configData.startDate.toISOString(),
      });

      const activeEntities = selectedEntities.filter(
        (entity) => entity.isActive,
      );
      if (activeEntities.length > 0) {
        await db.insert(ensScheduleGroupMapping).values(
          activeEntities.map((entity) => ({
            ensId: entity.ensId,
            groupId: newGroupId,
          })),
        );
      }
    }

    return { success: true, groupId: groupId || 'new_group_id' };
  } catch (error) {
    console.error('Error updating periodic monitoring configuration:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

export async function getGroupConfig(groupId: string) {
  if (groupId === 'new') {
    return null;
  }

  const groupConfig: (typeof scheduleMonitoring.$inferSelect)[] = await db
    .select()
    .from(scheduleMonitoring)
    .where(eq(scheduleMonitoring.groupId, groupId))
    .limit(1);

  return groupConfig.length > 0 ? groupConfig[0] : null;
}

async function updateEntityMappings(
  groupId: string,
  selectedEntities: { ensId: string; isActive: boolean }[],
) {
  const currentEnsIds = await getEnsIdsByGroupId(groupId);

  const entitiesToAdd = selectedEntities
    .filter((entity) => entity.isActive && !currentEnsIds.has(entity.ensId))
    .map((e) => e.ensId);

  const entitiesToRemove = selectedEntities
    .filter((entity) => !entity.isActive && currentEnsIds.has(entity.ensId))
    .map((e) => e.ensId);

  if (entitiesToAdd.length > 0) {
    await db.insert(ensScheduleGroupMapping).values(
      entitiesToAdd.map((ensId) => ({
        ensId,
        groupId,
      })),
    );
  }

  if (entitiesToRemove.length > 0) {
    await db
      .delete(ensScheduleGroupMapping)
      .where(
        eq(ensScheduleGroupMapping.groupId, groupId) &&
        inArray(ensScheduleGroupMapping.ensId, entitiesToRemove),
      );
  }
}

export async function updateEntityGroupMappings(
  ensId: string,
  selectedGroups: { [groupId: string]: boolean },
) {
  try {
    const groupsToRemove = Object.keys(selectedGroups).filter(
      (groupId) => !selectedGroups[groupId],
    );

    if (groupsToRemove.length > 0) {
      await db
        .delete(ensScheduleGroupMapping)
        .where(
          eq(ensScheduleGroupMapping.ensId, ensId) &&
          inArray(ensScheduleGroupMapping.groupId, groupsToRemove),
        );
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating entity group mappings:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

export async function getAssociatedEntitiesCount(groupId: string) {
  try {
    const total = await db
      .select({ count: count() })
      .from(ensScheduleGroupMapping)
      .where(eq(ensScheduleGroupMapping.groupId, groupId));
    return total[0].count;
  } catch (error) {
    console.error('Error getting group count:', error);
    return 0;
  }
}
