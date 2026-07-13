import { NextRequest } from 'next/server';

import {
  inArray,
  ilike,
  and,
  count,
  asc,
  desc,
  type AnyColumn,
  eq,
  sql,
  ne,
  notInArray,
  isNull,
  or,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  ensidScreeningStatus,
  ensScheduleGroupMapping,
  entityUniverse,
  scheduleMonitoring,
  sessionScreeningStatus,
  supplierMasterData,
  uploadSupplierData,
  usersTable,
} from '@/drizzle/schema';

import { getPaginationAndSorting } from './utils';
import { SupplierCombinedStatus } from '@/types/supplier';

type FilterValues = Record<string, string | string[]>;
type ColumnMap = Record<string, any>;

export function buildDrizzleFilters(
  filterValues: FilterValues,
  columnMap: ColumnMap,
) {
  const filters = [];

  for (const [key, value] of Object.entries(filterValues)) {
    const column = columnMap[key];
    if (!column) continue;
    if (Array.isArray(value) && value.length > 0) {
      filters.push(inArray(column, value));
    } else if (value !== undefined && value !== null && value !== '') {
      filters.push(ilike(column, `%${value}%`));
    }
  }
  return filters;
}

export async function getTableData({
  req,
  table,
  filterValues,
  dynamicFilters,
}: {
  req: NextRequest;
  table: any;
  filterValues: FilterValues;
  dynamicFilters?: any[];
}) {
  const searchParams = req.nextUrl.searchParams;
  const { page, pageSize, sortBy, sortOrder } =
    getPaginationAndSorting(searchParams);

  const filters = buildDrizzleFilters(filterValues, table);

  if (dynamicFilters) {
    filters.push(...dynamicFilters);
  }

  const totalRecords = await db
    .select({ count: count() })
    .from(table)
    .where(filters.length ? and(...filters) : undefined);

  const data = await db
    .select()
    .from(table)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(
      sortOrder === 'asc'
        ? asc(table[sortBy as keyof typeof table] as AnyColumn)
        : desc(table[sortBy as keyof typeof table] as AnyColumn),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    totalRecords: totalRecords[0].count,
    data,
  };
}

export async function getUniverseData(
  req: NextRequest,
  filterValues: FilterValues,
) {
  return getTableData({
    req,
    table: entityUniverse,
    filterValues,
  });
}

export async function getSessionInfo(
  req: NextRequest,
  filterValues: FilterValues,
) {
  return getTableData({
    req,
    table: sessionScreeningStatus,
    filterValues,
    dynamicFilters: [
      ne(sessionScreeningStatus.screeningAnalysisStatus, 'NOT_STARTED'),
    ],
  });
}

export async function getSupplierData(
  req: NextRequest,
  filterValues: FilterValues,
) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  return getTableData({
    req,
    table: uploadSupplierData,
    filterValues,
    dynamicFilters: [
      eq(uploadSupplierData.sessionId, sessionId as string),
    ],
  });
}

export async function getResultsData(
  req: NextRequest,
  filterValues: FilterValues,
) {
  const searchParams = req.nextUrl.searchParams;

  const sessionId = searchParams.get('sessionId');

  const filters = buildDrizzleFilters(filterValues, supplierMasterData);

  const { page, pageSize, sortBy, sortOrder } =
    getPaginationAndSorting(searchParams);

  const totalRecords = await db
    .select({
      count: count(),
    })
    .from(supplierMasterData)
    .innerJoin(
      ensidScreeningStatus,
      and(
        eq(supplierMasterData.sessionId, ensidScreeningStatus.sessionId),
        eq(supplierMasterData.ensId, ensidScreeningStatus.ensId),
      ),
    )
    .where(
      and(eq(supplierMasterData.sessionId, sessionId as string), ...filters),
    );

  const data = await db
    .select()
    .from(supplierMasterData)
    .fullJoin(
      ensidScreeningStatus,
      and(
        eq(supplierMasterData.sessionId, ensidScreeningStatus.sessionId),
        eq(supplierMasterData.ensId, ensidScreeningStatus.ensId),
      ),
    )
    .where(
      and(eq(supplierMasterData.sessionId, sessionId as string), ...filters),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .orderBy(
      sortOrder === 'asc'
        ? asc(
            supplierMasterData[
              sortBy as keyof typeof supplierMasterData
            ] as AnyColumn,
          )
        : desc(
            supplierMasterData[
              sortBy as keyof typeof supplierMasterData
            ] as AnyColumn,
          ),
    );
  const results = data.map((row) => ({
    ...row.supplier_master_data,
    ...row.ensid_screening_status,
  }));

  const response = {
    totalRecords: totalRecords[0].count,
    data: results as SupplierCombinedStatus[],
  };

  return response;
}

export async function getValidationResults(
  req: NextRequest,
  filterValues: FilterValues,
) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  return getTableData({
    req,
    table: uploadSupplierData,
    filterValues,
    dynamicFilters: [
      eq(uploadSupplierData.sessionId, sessionId as string),
    ],
  });
}

export async function getValidationCount(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  const baseWhere = eq(uploadSupplierData.sessionId, sessionId as string);

  const validationStats = await db
    .select({
      directMatchFoundCount: sql<number>`SUM(CASE WHEN ${uploadSupplierData.finalValidationStatus} = 'AUTO_ACCEPT' THEN 1 ELSE 0 END)`,
      requiresReviewCount: sql<number>`SUM(CASE WHEN ${uploadSupplierData.finalValidationStatus} = 'REVIEW' THEN 1 ELSE 0 END)`,
      duplicateOrNoMatchCount: sql<number>`SUM(CASE WHEN (
            ${uploadSupplierData.finalValidationStatus} = 'AUTO_REJECT' AND ${uploadSupplierData.duplicateInSession} = 'REMOVE'
          ) OR (
            ${uploadSupplierData.finalValidationStatus} = 'AUTO_REJECT' AND ${uploadSupplierData.validationStatus} = 'NOT_VALIDATED'
          ) THEN 1 ELSE 0 END)`,
    })
    .from(uploadSupplierData)
    .where(baseWhere);

  const response = {
    directMatchFoundCount: Number(
      validationStats[0]?.directMatchFoundCount || 0,
    ),
    requiresReviewCount: Number(validationStats[0]?.requiresReviewCount || 0),
    duplicateOrNoMatchCount: Number(
      validationStats[0]?.duplicateOrNoMatchCount || 0,
    ),
  };

  return response;
}

export async function getUserByEmail(email: string) {
  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  return user;
}

export async function getPeriodicMonitoringResultTableData(
  req: NextRequest,
  filterValues: FilterValues,
) {
  const searchParams = req.nextUrl.searchParams;
  const groupId = searchParams.get('groupId');

  const filters = buildDrizzleFilters(filterValues, entityUniverse);

  const { page, pageSize, sortBy, sortOrder } =
    getPaginationAndSorting(searchParams);

  const totalRecords = await db
    .select({
      total: count(),
    })
    .from(entityUniverse)
    .innerJoin(
      ensScheduleGroupMapping,
      eq(entityUniverse.ensId, ensScheduleGroupMapping.ensId),
    )
    .where(
      and(eq(ensScheduleGroupMapping.groupId, groupId as string), ...filters),
    );

  const data = await db
    .select({
      ensId: entityUniverse.ensId,
      externalVendorId: entityUniverse.externalVendorId,
      name: entityUniverse.name,
      nationalId: entityUniverse.panId,
      country: entityUniverse.country,
      address: entityUniverse.address,
      overallSupplierRating: entityUniverse.overallSupplierRating,
      lastScreenedDate: entityUniverse.lastScreenedDate,
      lastSessionId: entityUniverse.lastSessionId,
      isScreenedAfterGroup: sql<boolean>`CASE 
        WHEN ${entityUniverse.lastScreenedDate} > ${scheduleMonitoring.lastScheduledDate} 
        THEN true 
        ELSE false 
      END`,
    })
    .from(entityUniverse)
    .innerJoin(
      ensScheduleGroupMapping,
      eq(entityUniverse.ensId, ensScheduleGroupMapping.ensId),
    )
    .innerJoin(
      scheduleMonitoring,
      eq(ensScheduleGroupMapping.groupId, scheduleMonitoring.groupId),
    )
    .where(
      and(eq(ensScheduleGroupMapping.groupId, groupId as string), ...filters),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .orderBy(
      sortOrder === 'asc'
        ? asc(
            entityUniverse[sortBy as keyof typeof entityUniverse] as AnyColumn,
          )
        : desc(
            entityUniverse[sortBy as keyof typeof entityUniverse] as AnyColumn,
          ),
    );

  const response = {
    totalRecords: totalRecords[0].total,
    data,
  };

  return response;
}

export async function getPeriodicMonitoringConfigData(groupId: string) {
  const periodicMonitoringConfig = await db
    .select()
    .from(scheduleMonitoring)
    .where(eq(scheduleMonitoring.groupId, groupId))
    .limit(1);

  return periodicMonitoringConfig.length > 0
    ? periodicMonitoringConfig[0]
    : null;
}

export async function getEntityUniverseByGroup(
  req: NextRequest,
  filterValues: FilterValues,
) {
  const searchParams = req.nextUrl.searchParams;

  const groupId = searchParams.get('groupId');

  const actionFilters = { ...filterValues };
  delete actionFilters['actions'];

  const filters = buildDrizzleFilters(actionFilters, {
    ...entityUniverse,
    ...ensScheduleGroupMapping,
  });

  const response = {
    totalRecords: 0,
    data: [],
  };

  const hasGroup = filterValues['actions'] === 'inGroup';
  const hasInactive = filterValues['actions'] === 'notInGroup';

  const currentEnsIds = await getEnsIdsByGroupId(groupId as string);

  const { page, pageSize, sortBy, sortOrder } =
    getPaginationAndSorting(searchParams);

  type ScheduleGroupMappingColumn = keyof typeof ensScheduleGroupMapping;
  type EntityUniverseColumn = keyof typeof entityUniverse;
  type SortableColumns = ScheduleGroupMappingColumn | EntityUniverseColumn;

  const sortColumn =
    (sortBy as SortableColumns) in entityUniverse
      ? entityUniverse[sortBy as EntityUniverseColumn]
      : ensScheduleGroupMapping[sortBy as ScheduleGroupMappingColumn];

  if (hasGroup) {
    const totalRecords = await db
      .select({
        total: count(),
      })
      .from(entityUniverse)
      .where(
        and(
          inArray(entityUniverse.ensId, Array.from(currentEnsIds)),
          filters.length > 0 ? and(...filters) : undefined,
        ),
      );

    response.totalRecords = totalRecords[0].total;

    const allRecords = await db
      .select()
      .from(entityUniverse)
      .where(
        and(
          inArray(entityUniverse.ensId, Array.from(currentEnsIds)),
          filters.length > 0 ? and(...filters) : undefined,
        ),
      )
      .orderBy(
        sortOrder === 'asc'
          ? asc(sortColumn as AnyColumn)
          : desc(sortColumn as AnyColumn),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    response.data = allRecords.map((row) => ({
      ...row,
      groupId,
    })) as any;
  } else if (hasInactive) {
    const totalRecords = await db
      .select({
        total: count(),
      })
      .from(entityUniverse)
      .where(
        and(
          notInArray(entityUniverse.ensId, Array.from(currentEnsIds)),
          filters.length > 0 ? and(...filters) : undefined,
        ),
      );

    response.totalRecords = totalRecords[0].total;

    const allRecords = await db
      .select()
      .from(entityUniverse)
      .where(
        and(
          notInArray(entityUniverse.ensId, Array.from(currentEnsIds)),
          filters.length > 0 ? and(...filters) : undefined,
        ),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    response.data = allRecords.map((row) => ({
      ...row,
      groupId: null,
    })) as any;
  } else {
    const totalRecords = await db
      .select({
        total: count(),
      })
      .from(entityUniverse)
      .where(filters.length > 0 ? and(...filters) : undefined);

    response.totalRecords = totalRecords[0].total;

    const allRecords = await db
      .select()
      .from(entityUniverse)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(
        sortOrder === 'asc'
          ? asc(sortColumn as AnyColumn)
          : desc(sortColumn as AnyColumn),
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    response.data = allRecords.map((row) => ({
      ...row,
      groupId: Array.from(currentEnsIds).includes(row.ensId) ? groupId : null,
    })) as any;
  }

  return response;
}

export async function getUniqueCountries() {
  const countries = await db
    .selectDistinct({ country: entityUniverse.country })
    .from(entityUniverse);

  const response = countries.map((country) => country.country);

  return response;
}

export async function getEnsIdsByGroupId(groupId: string) {
  const currentMappings = await db
    .select({ ensId: ensScheduleGroupMapping.ensId })
    .from(ensScheduleGroupMapping)
    .where(eq(ensScheduleGroupMapping.groupId, groupId));

  const currentEnsIds = new Set(currentMappings.map((m) => m.ensId));

  return currentEnsIds;
}
