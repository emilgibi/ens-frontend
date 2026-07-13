import { db } from '@/db';
import { scheduleMonitoring, ensScheduleGroupMapping } from '@/drizzle/schema';
import { eq, count, asc, sql } from 'drizzle-orm';

export async function GET() {
  const groups = await db
    .select()
    .from(scheduleMonitoring)
    .orderBy(
      sql`CASE WHEN ${scheduleMonitoring.status} = 'ACTIVE' THEN 0 ELSE 1 END`,
      asc(scheduleMonitoring.nextRunDate)
    );

  const enrichedGroups = await Promise.all(
    groups.map(async (group) => {
      const entityCountResult = await db
        .select({ count: count() })
        .from(ensScheduleGroupMapping)
        .where(eq(ensScheduleGroupMapping.groupId, group.groupId));
      return {
        ...group,
        entities: entityCountResult[0].count,
      };
    })
  );

  return Response.json(enrichedGroups);
}
