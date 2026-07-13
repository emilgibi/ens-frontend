import RatingCard from '@/components/entity-universe/rating-card';
import RatingCardInternational from '@/components/entity-universe/rating-card-international';
import EntityUniverseTable from '@/components/entity-universe/table';
import EntityAnalysisTab from '@/components/entity-universe/entity-analysis';
import { StatCard } from '@/components/shared/stat-card';
import { db } from '@/db';
import { entityUniverse } from '@/drizzle/schema';
import { count, and, gt, sql } from 'drizzle-orm';
import { Building2, FileText } from 'lucide-react';
import { getAllInternationalEntities, getInternationalRiskCounts } from '@/lib/orbis-entity-universe';

export const dynamic = 'force-dynamic';

export default async function EntityUniversePage() {
  const totalRecords = await db.select({ count: count() }).from(entityUniverse);

  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentReports = await db
    .select({ count: count() })
    .from(entityUniverse)
    .where(
      and(
        sql`${entityUniverse.lastScreenedDate} IS NOT NULL`,
        gt(entityUniverse.lastScreenedDate, twoWeeksAgo.toISOString()),
      ),
    );

  // International stats fetched here (server component) rather than in the
  // client tabs component, since reaching Orbis requires the
  // moodys_access_token cookie — cookies() is server-only.
  const internationalEntities = await getAllInternationalEntities();
  const internationalTotalCount = internationalEntities.length;
  const internationalRecentCount = internationalEntities.filter((e) => {
    const createTime = e['create_time'];
    return createTime && new Date(createTime) > twoWeeksAgo;
  }).length;

  // Risk Distribution for international entities — turns out this IS
  // available after all (see lib/orbis-entity-universe.ts): Orbis's
  // /graph/get-submodal-profile is the same function as Probe42's,
  // reading the same "ovar" ratings table, just per-entity instead of
  // aggregated in a local table. Bucketed here the same way
  // rating-card.tsx buckets Probe42's data.
  const internationalRiskCounts = await getInternationalRiskCounts(internationalEntities);

  return (
    <EntityUniverseTabsClient
      totalCount={totalRecords[0].count}
      recentCount={recentReports[0].count}
      ratingCard={<RatingCard />}
      internationalTotalCount={internationalTotalCount}
      internationalRecentCount={internationalRecentCount}
      internationalRatingCard={
        <RatingCardInternational
          high={internationalRiskCounts.high}
          medium={internationalRiskCounts.medium}
          low={internationalRiskCounts.low}
        />
      }
    />
  );
}

import EntityUniverseTabsClient from '@/components/entity-universe/tabs-client';