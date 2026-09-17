import { db } from '@/db';
import { sessionScreeningStatus, sessionGroupMapping, scheduleMonitoring, entityUniverse } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * This route originally only ever queried the frontend's own local Postgres
 * (session_screening_status table) — same problem as everywhere else in
 * this app (see get-screening-history-pipeline, get-validation-count-pipeline):
 * that table is only ever written to by the Probe42/domestic backend. Orbis
 * writes its session data into a completely separate database the frontend
 * never connects to, so this always 404'd for international sessions —
 * which is why results.tsx's "Session Details" card (which only renders
 * when this call succeeds) silently disappeared for international sessions
 * once opened from Screening History (no live WebSocket there to paper
 * over it, unlike the just-finished-a-live-run case).
 *
 * This fallback mirrors get-screening-history-pipeline's approach: find the
 * session's own row via Orbis's GET /supplier/get-session-screening-status
 * (no per-session filter, so page through and match session_id — same
 * pattern as orbis-entity-universe.ts), then compute completed/failed/
 * skipped counts the same way get-validation-count-pipeline computes its
 * own counts — by paging through GET /supplier/get-main-supplier-data-compiled
 * (the same per-entity join the results table itself already uses) and
 * counting overall_status values, since Orbis's session-list endpoint's
 * column selection doesn't include those counts (confirmed by reading
 * get_session_screening_status() in coe-ens-application-backend-orbis).
 *
 * Known limitation, same as get-screening-history-pipeline: Orbis's session
 * list doesn't return source/sourceId, so international rows show a
 * best-effort 'NU' default instead of a real value.
 */
const MAX_SESSIONS = 1000;

async function fetchInternationalSessionInfo(sessionId: string): Promise<Record<string, unknown> | null> {
    const backendBase = process.env.SERVER_MOODYS_BACKEND || process.env.NEXT_PUBLIC_MOODYS_BACKEND;
    if (!backendBase) return null;

    const cookieStore = await cookies();
    const token = cookieStore.get('moodys_access_token')?.value;
    if (!token) return null;

    try {
        const sessionListUrl = new URL(`${backendBase}/supplier/get-session-screening-status`);
        sessionListUrl.searchParams.set('page_no', '1');
        sessionListUrl.searchParams.set('rows_per_page', String(MAX_SESSIONS));

        const sessionListRes = await fetch(sessionListUrl.toString(), {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!sessionListRes.ok) return null;

        const sessionListRaw = await sessionListRes.json();
        const sessionListInner = sessionListRaw?.data ?? sessionListRaw;
        const sessionRows: any[] = Array.isArray(sessionListInner) ? sessionListInner : (sessionListInner?.data ?? []);
        const match = sessionRows.find((row) => row.session_id === sessionId);
        if (!match) return null;

        // Same le=1000-per-page backend cap as get-validation-count-pipeline —
        // page through so sessions with more entities than that still get
        // accurate counts.
        const PAGE_SIZE = 1000;
        const MAX_PAGES = 50;
        const entityRows: Record<string, unknown>[] = [];
        let pageNo = 1;

        while (pageNo <= MAX_PAGES) {
            const entityUrl = new URL(`${backendBase}/supplier/get-main-supplier-data-compiled`);
            entityUrl.searchParams.set('session_id', sessionId);
            entityUrl.searchParams.set('page_no', String(pageNo));
            entityUrl.searchParams.set('rows_per_page', String(PAGE_SIZE));

            const entityRes = await fetch(entityUrl.toString(), {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!entityRes.ok) break;

            const entityRaw = await entityRes.json();
            const entityInner = entityRaw?.data ?? entityRaw;
            const pageRows: Record<string, unknown>[] = Array.isArray(entityInner) ? entityInner : (entityInner?.data ?? []);
            const totalData: number = (entityInner as any)?.total_data ?? entityRaw?.total_data ?? pageRows.length;

            entityRows.push(...pageRows);
            if (pageRows.length < PAGE_SIZE || entityRows.length >= totalData) break;
            pageNo++;
        }

        let completedEnsCount = 0;
        let failedEnsCount = 0;
        let skippedEnsCount = 0;
        for (const row of entityRows) {
            const s = row['overall_status'];
            if (s === 'COMPLETED') completedEnsCount++;
            else if (s === 'FAILED') failedEnsCount++;
            else if (s === 'SKIPPED') skippedEnsCount++;
        }

        return {
            sessionId: match.session_id,
            overallStatus: match.overall_status,
            screeningAnalysisStatus: match.screening_analysis_status,
            supplierNameValidationStatus: match.supplier_name_validation_status,
            listUploadStatus: match.list_upload_status,
            createTime: match.create_time,
            updateTime: match.update_time,
            source: 'NU',
            sourceId: null,
            sourceDisplay: null,
            screeningType: 'international',
            totalEnsCount: entityRows.length,
            completedEnsCount,
            failedEnsCount,
            skippedEnsCount,
        };
    } catch (err) {
        console.error('[get-session-info-by-id] failed to fetch international session info:', err);
        return null;
    }
}

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
            const internationalInfo = await fetchInternationalSessionInfo(sessionId);
            if (internationalInfo) {
                return NextResponse.json(internationalInfo);
            }
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
