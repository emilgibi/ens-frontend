import { db } from '@/db';
import { sessionScreeningStatus, sessionGroupMapping, scheduleMonitoring, entityUniverse } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
        return NextResponse.json(
            { error: 'sessionId is required' },
            { status: 400 },
        );
    }

    try {
        const sessionInfo = await db
            .select()
            .from(sessionScreeningStatus)
            .where(eq(sessionScreeningStatus.sessionId, sessionId))
            .limit(1);

        if (sessionInfo.length === 0) {
            return NextResponse.json(
                { error: 'Session not found' },
                { status: 404 },
            );
        }

        const session = sessionInfo[0];
        let sourceDisplay = null;

        // Resolve sourceId based on source type
        if (session.sourceId) {
            if (session.source === 'PD') {
                // PM source - get group name
                try {
                    const groupMapping = await db
                        .select({ groupId: sessionGroupMapping.groupId })
                        .from(sessionGroupMapping)
                        .where(eq(sessionGroupMapping.sourceId, session.sourceId))
                        .limit(1);

                    if (groupMapping.length > 0 && groupMapping[0].groupId) {
                        const scheduleInfo = await db
                            .select({ groupName: scheduleMonitoring.groupName })
                            .from(scheduleMonitoring)
                            .where(eq(scheduleMonitoring.groupId, groupMapping[0].groupId))
                            .limit(1);

                        if (scheduleInfo.length > 0) {
                            sourceDisplay = scheduleInfo[0].groupName;
                        }
                    }
                } catch (error) {
                    console.warn('Error resolving PM source:', error);
                }
            } else if (session.source === 'CM') {
                // CM source - get entity name
                try {
                    const entityInfo = await db
                        .select({ name: entityUniverse.name })
                        .from(entityUniverse)
                        .where(eq(entityUniverse.ensId, session.sourceId))
                        .limit(1);

                    if (entityInfo.length > 0) {
                        sourceDisplay = entityInfo[0].name;
                    }
                } catch (error) {
                    console.warn('Error resolving CM source:', error);
                }
            } else {
                try {
                    sourceDisplay = session.sourceId;
                } catch (error) {
                    console.warn('Error resolving other source:', error);
                }
            }
        }

        return NextResponse.json({
            ...session,
            sourceDisplay
        });
    } catch (error) {
        console.error('Error fetching session info:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 },
        );
    }
}
