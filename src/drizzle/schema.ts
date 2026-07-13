import { pgTable, varchar, unique, serial, text, date, boolean, timestamp, integer, doublePrecision, jsonb, uniqueIndex, uuid, index, foreignKey, bigserial, bigint, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const dupinsession = pgEnum("dupinsession", ['RETAIN', 'REMOVE', 'UNIQUE'])
export const finalstatus = pgEnum("finalstatus", ['ACCEPTED', 'REJECTED', 'PENDING'])
export const finalvalidatedstatus = pgEnum("finalvalidatedstatus", ['VALIDATED', 'NOT_VALIDATED', 'NOT_REQUIRED', 'PENDING', 'FAILED', 'AUTO_REJECT', 'AUTO_ACCEPT', 'REVIEW'])
export const geocodeSourceEnum = pgEnum("geocode_source_enum", ['not_called', 'google', 'llm'])
export const groupintervals = pgEnum("groupintervals", ['HOUR', 'DAY', 'WEEK', 'MONTH', 'QUARTER', 'YEAR'])
export const notificationtype = pgEnum("notificationtype", ['UPDATE', 'ALERT', 'RATING_CHANGE'])
export const oribismatchstatus = pgEnum("oribismatchstatus", ['MATCH', 'NO_MATCH', 'PENDING'])
export const periodicsessiontype = pgEnum("periodicsessiontype", ['NEW_SESSION', 'RETRY_SESSION', 'SKIPPED'])
export const sourceenum = pgEnum("sourceenum", ['NU', 'OD', 'CM', 'PD'])
export const status = pgEnum("status", ['QUEUED', 'SKIPPED', 'NOT_STARTED', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'PENDING', 'ACTIVE', 'INACTIVE'])
export const stepStatusEnum = pgEnum("step_status_enum", ['not_called', 'failed', 'passed'])
export const validationstatus = pgEnum("validationstatus", ['VALIDATED', 'NOT_VALIDATED', 'PENDING'])
export const screeningtypeenum = pgEnum("screeningtypeenum", ['domestic', 'international'])


export const alembicVersion = pgTable("alembic_version", {
	versionNum: varchar("version_num", { length: 32 }).primaryKey().notNull(),
});

export const newsMaster = pgTable("news_master", {
	id: serial().primaryKey().notNull(),
	link: text(),
	name: varchar().notNull(),
	title: text(),
	category: text(),
	summary: text(),
	newsDate: date("news_date"),
	sentiment: varchar(),
	contentFiltered: boolean("content_filtered"),
	country: text(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	error: text(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_name_link_date").on(table.link, table.name, table.newsDate),
]);

export const notification = pgTable("notification", {
	id: serial().primaryKey().notNull(),
	ensId: varchar("ens_id", { length: 50 }),
	notificationType: notificationtype("notification_type").default('UPDATE').notNull(),
	title: varchar({ length: 255 }),
	description: text(),
	theme: varchar({ length: 100 }),
	dataValue: text("data_value"),
	sessionId: varchar("session_id", { length: 50 }),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const ovar = pgTable("ovar", {
	id: serial().primaryKey().notNull(),
	kpiArea: varchar("kpi_area").notNull(),
	kpiCode: varchar("kpi_code").notNull(),
	kpiFlag: boolean("kpi_flag").notNull(),
	kpiValue: varchar("kpi_value"),
	kpiDetails: varchar("kpi_details"),
	ensId: varchar("ens_id").notNull(),
	sessionId: varchar("session_id").notNull(),
	kpiRating: varchar("kpi_rating"),
	kpiDefinition: varchar("kpi_definition"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ensid_session_kpiovar").on(table.ensId, table.kpiCode, table.sessionId),
]);

export const scheduleMonitoring = pgTable("schedule_monitoring", {
	id: serial().primaryKey().notNull(),
	groupId: varchar("group_id").notNull(),
	groupName: varchar("group_name"),
	periodicity: varchar(),
	frequency: integer().notNull(),
	interval: groupintervals().default('WEEK').notNull(),
	startDate: timestamp("start_date", { withTimezone: true, mode: 'string' }).defaultNow(),
	nextRunDate: timestamp("next_run_date", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastScheduledDate: timestamp("last_scheduled_date", { withTimezone: true, mode: 'string' }).defaultNow(),
	lastStartTime: timestamp("last_start_time", { withTimezone: true, mode: 'string' }).defaultNow(),
	status: status().default('ACTIVE').notNull(),
	groupDescription: text("group_description"),
	createdBy: varchar("created_by"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("schedule_monitoring_group_id_key").on(table.groupId),
]);

export const sessionConfiguration = pgTable("session_configuration", {
	id: serial().primaryKey().notNull(),
	clientId: varchar("client_id", { length: 50 }).notNull(),
	sessionId: varchar("session_id", { length: 50 }).notNull(),
	module: varchar({ length: 50 }),
	moduleActiveStatus: boolean("module_active_status").notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_session_configuration").on(table.module, table.sessionId),
]);

export const sessionGroupMapping = pgTable("session_group_mapping", {
	id: serial().primaryKey().notNull(),
	sessionId: varchar("session_id"),
	groupId: varchar("group_id"),
	sourceId: varchar("source_id"),
	mappingType: periodicsessiontype("mapping_type").default('NEW_SESSION').notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const sessionScreeningStatus = pgTable("session_screening_status", {
	id: serial().primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 50 }).notNull(),
	overallStatus: status("overall_status").default('NOT_STARTED').notNull(),
	listUploadStatus: status("list_upload_status").default('NOT_STARTED').notNull(),
	supplierNameValidationStatus: status("supplier_name_validation_status").default('NOT_STARTED').notNull(),
	screeningAnalysisStatus: status("screening_analysis_status").default('NOT_STARTED').notNull(),
	totalEnsCount: integer("total_ens_count"),
	completedEnsCount: integer("completed_ens_count"),
	failedEnsCount: integer("failed_ens_count"),
	skippedEnsCount: integer("skipped_ens_count"),
	source: sourceenum().default('NU').notNull(),
	sourceId: varchar("source_id"),
	screeningType: screeningtypeenum("screening_type").default('domestic').notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_sessionid_session").on(table.sessionId),
]);

export const adverseMedia = pgTable("adverse_media", {
	id: serial().primaryKey().notNull(),
	kpiArea: varchar("kpi_area").notNull(),
	kpiCode: varchar("kpi_code").notNull(),
	kpiFlag: boolean("kpi_flag").notNull(),
	kpiValue: varchar("kpi_value"),
	kpiDetails: varchar("kpi_details"),
	ensId: varchar("ens_id").notNull(),
	sessionId: varchar("session_id").notNull(),
	kpiRating: varchar("kpi_rating"),
	kpiDefinition: varchar("kpi_definition"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ensid_session_kpirfct").on(table.ensId, table.kpiCode, table.sessionId),
]);

export const apiKeys = pgTable("api_keys", {
	id: serial().primaryKey().notNull(),
	apiKey: varchar("api_key").notNull(),
	userId: varchar("user_id").notNull(),
	isActive: boolean("is_active"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("api_keys_api_key_key").on(table.apiKey),
	unique("api_keys_unique").on(table.apiKey, table.userId),
]);

export const addressZoneMaster = pgTable("address_zone_master", {
	id: integer(),
	geoId: varchar("geo_id", { length: 50 }).primaryKey().notNull(),
	name: varchar({ length: 255 }),
	address: text(),
	lat: doublePrecision(),
	lng: doublePrecision(),
	identifier: varchar({ length: 255 }),
	identifierType: varchar("identifier_type", { length: 100 }),
	entityType: varchar("entity_type", { length: 100 }),
	places: jsonb(),
	zone: varchar({ length: 50 }),
	confidence: integer(),
	reason: text(),
	geocodeStatus: stepStatusEnum("geocode_status"),
	placesStatus: stepStatusEnum("places_status"),
	llmStatus: stepStatusEnum("llm_status"),
	geocodeSource: geocodeSourceEnum("geocode_source"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const clientConfiguration = pgTable("client_configuration", {
	id: serial().primaryKey().notNull(),
	clientId: varchar("client_id", { length: 50 }).notNull(),
	clientName: varchar("client_name", { length: 250 }),
	kpiTheme: varchar("kpi_theme", { length: 50 }),
	reportSection: varchar("report_section", { length: 50 }),
	kpiArea: varchar("kpi_area").notNull(),
	moduleEnabledStatus: boolean("module_enabled_status").notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_client_configuration").on(table.clientId, table.clientName, table.kpiArea, table.kpiTheme, table.reportSection),
]);

export const companyProfile = pgTable("company_profile", {
	id: serial().primaryKey().notNull(),
	name: varchar(),
	uploadedName: varchar("uploaded_name", { length: 255 }),
	externalVendorId: varchar("external_vendor_id"),
	location: varchar(),
	address: varchar(),
	website: varchar(),
	eFilingStatus: varchar("e_filing_status"),
	category: varchar(),
	panId: varchar("pan_id"),
	alias: text(),
	incorporationDate: varchar("incorporation_date"),
	shareholders: text(),
	revenue: varchar(),
	subsidiaries: varchar(),
	keyExecutives: text("key_executives"),
	employee: varchar(),
	sessionId: varchar("session_id", { length: 50 }).notNull(),
	ensId: varchar("ens_id", { length: 50 }).notNull(),
	identifier: varchar(),
	identifierType: varchar("identifier_type"),
	entityType: varchar("entity_type"),
	corporateGroup: varchar("corporate_group"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ensid_session").on(table.ensId, table.sessionId),
]);

export const cyberEsg = pgTable("cyber_esg", {
	id: serial().primaryKey().notNull(),
	kpiArea: varchar("kpi_area").notNull(),
	kpiCode: varchar("kpi_code").notNull(),
	kpiFlag: boolean("kpi_flag").notNull(),
	kpiValue: varchar("kpi_value"),
	kpiDetails: varchar("kpi_details"),
	ensId: varchar("ens_id").notNull(),
	sessionId: varchar("session_id").notNull(),
	kpiRating: varchar("kpi_rating"),
	kpiDefinition: varchar("kpi_definition"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ensid_session_kpicybesg").on(table.ensId, table.kpiCode, table.sessionId),
]);

export const ensScheduleGroupMapping = pgTable("ens_schedule_group_mapping", {
	id: serial().primaryKey().notNull(),
	ensId: varchar("ens_id").notNull(),
	groupId: varchar("group_id").notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const entityExistance = pgTable("entity_existance", {
	id: serial().primaryKey().notNull(),
	kpiArea: varchar("kpi_area").notNull(),
	kpiCode: varchar("kpi_code").notNull(),
	kpiFlag: boolean("kpi_flag").notNull(),
	kpiValue: varchar("kpi_value"),
	kpiDetails: varchar("kpi_details"),
	ensId: varchar("ens_id").notNull(),
	sessionId: varchar("session_id").notNull(),
	kpiRating: varchar("kpi_rating"),
	kpiDefinition: varchar("kpi_definition"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ensid_session_kpisape").on(table.ensId, table.kpiCode, table.sessionId),
]);

export const ensidScreeningStatus = pgTable("ensid_screening_status", {
	id: serial().primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 50 }).notNull(),
	ensId: varchar("ens_id", { length: 50 }),
	overallStatus: status("overall_status").default('NOT_STARTED').notNull(),
	orbisRetrievalStatus: status("orbis_retrieval_status").default('NOT_STARTED').notNull(),
	screeningModulesStatus: status("screening_modules_status").default('NOT_STARTED').notNull(),
	reportGenerationStatus: status("report_generation_status").default('NOT_STARTED').notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ensid_session_ensid_screening_status").on(table.ensId, table.sessionId),
]);

export const entityUniverse = pgTable("entity_universe", {
	id: integer(),
	ensId: varchar("ens_id", { length: 50 }).primaryKey().notNull(),
	cinId: varchar("cin_id", { length: 50 }),
	identifier: varchar({ length: 50 }),
	identifierType: varchar("identifier_type", { length: 50 }),
	entityType: varchar("entity_type", { length: 50 }),
	name: varchar({ length: 255 }),
	address: text(),
	city: varchar({ length: 100 }),
	country: varchar({ length: 100 }),
	phoneOrFax: varchar("phone_or_fax", { length: 50 }),
	emailOrWebsite: varchar("email_or_website", { length: 100 }),
	panId: varchar("pan_id", { length: 50 }),
	state: varchar({ length: 100 }),
	lastSessionId: varchar("last_session_id", { length: 50 }),
	overallSupplierRating: varchar("overall_supplier_rating", { length: 50 }),
	thematicRating: jsonb("thematic_rating"),
	management: jsonb(),
	unmodifiedName: varchar("unmodified_name", { length: 255 }),
	unmodifiedCinId: varchar("unmodified_cin_id", { length: 50 }),
	unmodifiedIdentifier: varchar("unmodified_identifier", { length: 50 }),
	unmodifiedIdentifierType: varchar("unmodified_identifier_type", { length: 50 }),
	unmodifiedEntityType: varchar("unmodified_entity_type", { length: 50 }),
	lastScreenedDate: timestamp("last_screened_date", { withTimezone: true, mode: 'string' }),
	externalVendorId: varchar("external_vendor_id"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const excludedEntities = pgTable("excluded_entities", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }),
	category: text(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const finance = pgTable("finance", {
	id: serial().primaryKey().notNull(),
	kpiArea: varchar("kpi_area").notNull(),
	kpiCode: varchar("kpi_code").notNull(),
	kpiFlag: boolean("kpi_flag").notNull(),
	kpiValue: varchar("kpi_value"),
	kpiDetails: varchar("kpi_details"),
	ensId: varchar("ens_id").notNull(),
	sessionId: varchar("session_id").notNull(),
	kpiRating: varchar("kpi_rating"),
	kpiDefinition: varchar("kpi_definition"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ensid_session_kpifstb").on(table.ensId, table.kpiCode, table.sessionId),
]);

export const googleRatings = pgTable("google_ratings", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }),
	rating: varchar({ length: 255 }),
	noOfReviews: text("no_of_reviews"),
	reviews: jsonb(),
	identifier: varchar({ length: 50 }),
	identifierType: varchar("identifier_type", { length: 50 }),
	entityType: varchar("entity_type", { length: 50 }),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const legal = pgTable("legal", {
	id: serial().primaryKey().notNull(),
	kpiArea: varchar("kpi_area").notNull(),
	kpiCode: varchar("kpi_code").notNull(),
	kpiFlag: boolean("kpi_flag").notNull(),
	kpiValue: varchar("kpi_value"),
	kpiDetails: varchar("kpi_details"),
	ensId: varchar("ens_id").notNull(),
	sessionId: varchar("session_id").notNull(),
	kpiRating: varchar("kpi_rating"),
	kpiDefinition: varchar("kpi_definition"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ensid_session_kpilgrk").on(table.ensId, table.kpiCode, table.sessionId),
]);

export const msmeCheck = pgTable("msme_check", {
	id: serial().primaryKey().notNull(),
	identifier: varchar({ length: 50 }).notNull(),
	pan: varchar({ length: 10 }).notNull(),
	name: varchar({ length: 100 }),
	msmeStatus: varchar("msme_status", { length: 50 }).notNull(),
	response: jsonb().notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_pan_identifier").on(table.identifier, table.pan),
]);

export const externalSupplierData = pgTable("external_supplier_data", {
	id: serial().primaryKey().notNull(),
	sessionId: varchar("session_id").notNull(),
	ensId: varchar("ens_id").notNull(),
	cinId: varchar("cin_id"),
	identifier: varchar(),
	entityType: varchar("entity_type"),
	identifierType: varchar("identifier_type"),
	uploadedAddress: varchar("uploaded_address"),
	bid: varchar(),
	legalName: varchar("legal_name", { length: 255 }).notNull(),
	eFilingStatus: varchar("e_filing_status", { length: 100 }),
	incorporationDate: date("incorporation_date"),
	address: text(),
	city: varchar({ length: 100 }),
	state: varchar({ length: 100 }),
	pan: varchar({ length: 50 }),
	website: text(),
	classification: varchar({ length: 100 }),
	alias: jsonb(),
	numberOfEmployees: integer("number_of_employees"),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	directors: jsonb(),
	financialRatios: jsonb("financial_ratios"),
	financialBs: jsonb("financial_bs"),
	financialPnl: jsonb("financial_pnl"),
	financialCashFlow: jsonb("financial_cash_flow"),
	creditRating: jsonb("credit_rating"),
	auditors: jsonb(),
	relatedPartyTransaction: jsonb("related_party_transaction"),
	shareholdings: jsonb(),
	subsidiary: jsonb(),
	openCharges: jsonb("open_charges"),
	legalHistory: jsonb("legal_history"),
	msme: jsonb(),
	gstDetails: jsonb("gst_details"),
	keyIndicators: jsonb("key_indicators"),
	b2BValidation: jsonb("b2b_validation"),
	domainValidation: jsonb("domain_validation"),
	addressValidation: jsonb("address_validation"),
	sanctions: jsonb(),
	zAltmanFactors: jsonb("z_altman_factors"),
	ratioFactors: jsonb("ratio_factors"),
	cyberRisk: jsonb("cyber_risk"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	uploadedClientOnboardingDate: date("uploaded_client_onboarding_date"),
	uploadedClientMsmeStatus: varchar("uploaded_client_msme_status"),
	uploadedClientZAltmanType: varchar("uploaded_client_z_altman_type"),
	googleRating: jsonb("google_rating"),
}, (table) => [
	unique("external_supplier_ensid_session").on(table.ensId, table.sessionId),
]);

export const summary = pgTable("summary", {
	id: serial().primaryKey().notNull(),
	sessionId: varchar("session_id", { length: 50 }).notNull(),
	ensId: varchar("ens_id", { length: 50 }),
	area: varchar({ length: 50 }).notNull(),
	summary: text(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("unique_ens_session_summary").on(table.area, table.ensId, table.sessionId),
]);

export const tokenMonitor = pgTable("token_monitor", {
	id: serial().primaryKey().notNull(),
	usageTime: timestamp("usage_time", { withTimezone: true, mode: 'string' }).defaultNow(),
	tokenUsed: integer("token_used").notNull(),
	payload: jsonb(),
	openaiModel: text("openai_model"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export const userAccount = pgTable("user_account", {
	userId: uuid("user_id").primaryKey().notNull(),
	email: varchar({ length: 256 }).notNull(),
	hashedPassword: varchar("hashed_password", { length: 128 }).notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("ix_user_account_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
]);

export const usersTable = pgTable("users_table", {
	id: integer(),
	userId: varchar("user_id").primaryKey().notNull(),
	email: varchar().notNull(),
	username: varchar().notNull(),
	password: varchar().notNull(),
	verified: boolean().notNull(),
	otp: varchar(),
	userGroup: varchar("user_group").notNull(),
	apiKey: varchar("api_key").notNull(),
	keyExpiresAt: timestamp("key_expires_at", { mode: 'string' }),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("ix_users_table_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("ix_users_table_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
	uniqueIndex("ix_users_table_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	unique("users_table_api_key_key").on(table.apiKey),
	unique("users_table_user_id_key").on(table.userId),
]);

export const refreshToken = pgTable("refresh_token", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	refreshToken: varchar("refresh_token", { length: 512 }).notNull(),
	used: boolean().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	exp: bigint({ mode: "number" }).notNull(),
	userId: varchar("user_id"),
	userGroup: varchar("user_group"),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("ix_refresh_token_refresh_token").using("btree", table.refreshToken.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.userId],
			name: "refresh_token_user_id_fkey"
		}).onDelete("cascade"),
]);

export const supplierMasterData = pgTable("supplier_master_data", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }),
	uploadedName: varchar("uploaded_name", { length: 255 }),
	uploadedCin: varchar("uploaded_cin", { length: 255 }),
	uploadedIdentifier: varchar("uploaded_identifier", { length: 255 }),
	uploadedEntityType: varchar("uploaded_entity_type", { length: 255 }),
	uploadedIdentifierType: varchar("uploaded_identifier_type", { length: 255 }),
	uploadedAddress: varchar("uploaded_address"),
	externalVendorId: varchar("external_vendor_id"),
	bid: varchar({ length: 255 }),
	cinId: varchar("cin_id", { length: 50 }),
	ensId: varchar("ens_id", { length: 50 }),
	sessionId: varchar("session_id", { length: 50 }).notNull(),
	identifier: varchar({ length: 255 }),
	entityType: varchar("entity_type", { length: 255 }),
	identifierType: varchar("identifier_type", { length: 255 }),
	validationStatus: validationstatus("validation_status").default('PENDING').notNull(),
	reportGenerationStatus: status("report_generation_status").default('NOT_STARTED').notNull(),
	finalStatus: finalstatus("final_status").default('PENDING').notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	uploadedClientOnboardingDate: date("uploaded_client_onboarding_date"),
	uploadedClientMsmeStatus: varchar("uploaded_client_msme_status"),
	uploadedClientZAltmanType: varchar("uploaded_client_z_altman_type"),
}, (table) => [
	unique("supplier_master_ensid_session").on(table.ensId, table.sessionId),
]);

export const uploadSupplierData = pgTable("upload_supplier_data", {
	id: serial().primaryKey().notNull(),
	ensId: varchar("ens_id").notNull(),
	sessionId: varchar("session_id").notNull(),
	userId: varchar("user_id"),
	uploadedExternalVendorId: varchar("uploaded_external_vendor_id"),
	uploadedName: varchar("uploaded_name"),
	uploadedCin: varchar("uploaded_cin", { length: 255 }),
	uploadedIdentifier: varchar("uploaded_identifier"),
	uploadedEntityType: varchar("uploaded_entity_type"),
	uploadedIdentifierType: varchar("uploaded_identifier_type"),
	uploadedAddress: varchar("uploaded_address"),
	unmodifiedName: varchar("unmodified_name"),
	unmodifiedIdentifier: varchar("unmodified_identifier"),
	unmodifiedEntityType: varchar("unmodified_entity_type"),
	unmodifiedIdentifierType: varchar("unmodified_identifier_type"),
	unmodifiedAddress: varchar("unmodified_address"),
	suggestedName: varchar("suggested_name"),
	suggestedCinId: varchar("suggested_cin_id"),
	suggestedIdentifier: varchar("suggested_identifier"),
	suggestedEntityType: varchar("suggested_entity_type"),
	suggestedIdentifierType: varchar("suggested_identifier_type"),
	suggestedBid: varchar("suggested_bid"),
	suggestedStatus: varchar("suggested_status"),
	name: varchar(),
	cinId: varchar("cin_id"),
	identifier: varchar(),
	entityType: varchar("entity_type"),
	identifierType: varchar("identifier_type"),
	status: varchar(),
	bid: varchar(),
	validationStatus: validationstatus("validation_status").default('PENDING').notNull(),
	finalStatus: finalstatus("final_status").default('PENDING').notNull(),
	finalValidationStatus: finalvalidatedstatus("final_validation_status").default('PENDING').notNull(),
	orbisMatchedStatus: oribismatchstatus("orbis_matched_status").default('PENDING').notNull(),
	matchPercentage: integer("match_percentage").notNull(),
	preexistingCinId: boolean("preexisting_cin_id").notNull(),
	processStatus: status("process_status").default('PENDING').notNull(),
	duplicateInSession: dupinsession("duplicate_in_session").default('UNIQUE').notNull(),
	createTime: timestamp("create_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updateTime: timestamp("update_time", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	uploadedClientOnboardingDate: date("uploaded_client_onboarding_date"),
	uploadedClientMsmeStatus: varchar("uploaded_client_msme_status"),
	uploadedClientZAltmanType: varchar("uploaded_client_z_altman_type"),
	unmodifiedClientOnboardingDate: date("unmodified_client_onboarding_date"),
	unmodifiedClientMsmeStatus: varchar("unmodified_client_msme_status"),
	unmodifiedClientZAltmanType: varchar("unmodified_client_z_altman_type"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [usersTable.userId],
			name: "upload_supplier_data_user_id_fkey"
		}).onDelete("cascade"),
]);

export const orgdata = pgTable("orgdata", {
	id: serial().primaryKey().notNull(),
	orgname: varchar({ length: 100 }).notNull(),
	orgidentifier: varchar({ length: 100 }).notNull(),
	bvdids: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("orgdata_bvdids_key").on(table.bvdids),
	unique("orgdata_orgidentifier_key").on(table.orgidentifier),
]);

export const matchbvdid = pgTable("matchbvdid", {
	bvdid: varchar({ length: 255 }).notNull(),
	name: varchar({ length: 255 }),
	nameInternational: varchar("name_international", { length: 255 }),
	address: text(),
	postcode: varchar({ length: 50 }),
	city: varchar({ length: 255 }),
	country: varchar({ length: 255 }),
	phoneOrFax: varchar("phone_or_fax", { length: 255 }),
	emailOrWebsite: varchar("email_or_website", { length: 255 }),
	nationalId: varchar("national_id", { length: 255 }),
	state: varchar({ length: 255 }),
	addressType: varchar("address_type", { length: 255 }),
	ensId: varchar("ens_id", { length: 255 }).primaryKey().notNull(),
});
