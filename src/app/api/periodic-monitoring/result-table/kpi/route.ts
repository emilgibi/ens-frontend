import { db } from '@/db';
import {
  ensScheduleGroupMapping,
  entityUniverse,
  scheduleMonitoring,
} from '@/drizzle/schema';
import { and, count, eq, sql } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get('groupId');

  if (!groupId) {
    return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
  }

  try {
    const groupInfoPromise = db
      .select({
        groupName: scheduleMonitoring.groupName,
        groupDescription: scheduleMonitoring.groupDescription,
        lastScreenedOn: scheduleMonitoring.lastScheduledDate,
        frequency: scheduleMonitoring.frequency,
        interval: scheduleMonitoring.interval,
        nextRunDate: scheduleMonitoring.nextRunDate,
      })
      .from(scheduleMonitoring)
      .where(eq(scheduleMonitoring.groupId, groupId))
      .limit(1);

    const totalEntitiesPromise = db
      .select({
        value: count(),
      })
      .from(ensScheduleGroupMapping)
      .where(eq(ensScheduleGroupMapping.groupId, groupId));

    const ratingsPromise = db
      .select({
        rating: entityUniverse.overallSupplierRating,
        count: count(),
      })
      .from(entityUniverse)
      .innerJoin(
        ensScheduleGroupMapping,
        eq(entityUniverse.ensId, ensScheduleGroupMapping.ensId),
      )
      .where(
        and(
          eq(ensScheduleGroupMapping.groupId, groupId),
          sql`${entityUniverse.overallSupplierRating} IN ('High', 'Medium', 'Low')`,
        ),
      )
      .groupBy(entityUniverse.overallSupplierRating);

    const [groupInfoResult, totalEntitiesResult, ratingsResult] =
      await Promise.all([
        groupInfoPromise,
        totalEntitiesPromise,
        ratingsPromise,
      ]);

    const groupInfo = groupInfoResult[0];
    const totalEntities = totalEntitiesResult[0].value;
    const ratings = {
      High: 0,
      Medium: 0,
      Low: 0,
    };

    ratingsResult.forEach((r) => {
      if (r.rating && r.rating in ratings) {
        ratings[r.rating as keyof typeof ratings] = r.count;
      }
    });

    const response = {
      groupInfo: {
        groupName: groupInfo.groupName,
        groupDescription: groupInfo.groupDescription,
        lastScreenedOn: groupInfo.lastScreenedOn,
        nextRunDate: groupInfo.nextRunDate,
      },
      totalEntities,
      ratings,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch periodic monitoring KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPI data' },
      { status: 500 },
    );
  }
}
