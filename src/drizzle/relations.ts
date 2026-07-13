import { relations } from "drizzle-orm/relations";
import { usersTable, refreshToken, uploadSupplierData } from "./schema";

export const refreshTokenRelations = relations(refreshToken, ({one}) => ({
	usersTable: one(usersTable, {
		fields: [refreshToken.userId],
		references: [usersTable.userId]
	}),
}));

export const usersTableRelations = relations(usersTable, ({many}) => ({
	refreshTokens: many(refreshToken),
	uploadSupplierData: many(uploadSupplierData),
}));

export const uploadSupplierDataRelations = relations(uploadSupplierData, ({one}) => ({
	usersTable: one(usersTable, {
		fields: [uploadSupplierData.userId],
		references: [usersTable.userId]
	}),
}));