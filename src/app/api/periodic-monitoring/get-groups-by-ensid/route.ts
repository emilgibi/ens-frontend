import { db } from '@/db';
import { scheduleMonitoring, ensScheduleGroupMapping } from '@/drizzle/schema';
import { eq, count, inArray } from 'drizzle-orm';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ensId = searchParams.get('ensId');

  if (!ensId) {
    return Response.json({ error: 'ensId is required' }, { status: 400 });
  }

  const groupMappings = await db
    .select({ groupId: ensScheduleGroupMapping.groupId })
    .from(ensScheduleGroupMapping)
    .where(eq(ensScheduleGroupMapping.ensId, ensId));

  if (groupMappings.length === 0) {
    return Response.json([]);
  }

  const groupIds = groupMappings.map((gm) => gm.groupId);

  const groups = await db
    .select()
    .from(scheduleMonitoring)
    .where(inArray(scheduleMonitoring.groupId, groupIds));

  const enrichedGroups = await Promise.all(
    groups.map(async (group) => {
      const entityCountResult = await db
        .select({ count: count() })
        .from(ensScheduleGroupMapping)
        .where(eq(ensScheduleGroupMapping.groupId, group.groupId));

      return {
        groupId: group.groupId,
        title: group.groupName || '',
        totalEntities: entityCountResult[0].count,
        lastScheduledDate: group.lastScheduledDate || '',
        groupDescription: group.groupDescription || '',
        status: group.status || '',
        checked: true,
        frequency: group.frequency,
        interval: group.interval,
      };
    }),
  );

  return Response.json(enrichedGroups);
}
