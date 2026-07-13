import { Status } from '@/types'

export interface Supplier {
  id: string
  sessionId: string

  // Uploaded data (domestic / Probe42)
  uploadedName: string
  uploadedIdentifier?: string
  uploadedEntityType?: string
  uploadedIdentifierType?: string
  uploadedAddress?: string

  // Uploaded data (international / Orbis-Moody's)
  uploadedNameInternational?: string
  uploadedCountry?: string
  uploadedNationalId?: string
  uploadedState?: string
  uploadedCity?: string
  uploadedPostcode?: string
  uploadedAddressType?: string

  // Suggested data (domestic / Probe42)
  suggestedName?: string
  suggestedIdentifier?: string      // ✅ ADD
  suggestedEntityType?: string      // ✅ ADD
  suggestedIdentifierType?: string  // ✅ ADD

  // Suggested data (international / Orbis-Moody's)
  suggestedNameInternational?: string
  suggestedCountry?: string
  suggestedNationalId?: string
  suggestedState?: string
  suggestedCity?: string
  suggestedPostcode?: string
  suggestedAddressType?: string
  bvdId?: string

  // Validation status
  finalValidationStatus: 'AUTO_ACCEPT' | 'AUTO_REJECT' | 'REVIEW'
  duplicateInSession: 'RETAIN' | 'REMOVE' | 'UNIQUE'
  validationStatus: 'VALIDATED' | 'NOT_VALIDATED' | 'PENDING'

  existingEntity: 'EXISTING' | 'NEW'

  // Entity ID
  ensId?: string
  isAccepted?: boolean

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface ValidationCounts {
  directMatchFoundCount: number
  requiresReviewCount: number
  duplicateOrNoMatchCount: number
}

export interface SupplierCombinedStatus {
  id: number
  name: string
  uploadedName: string
  uploadedAddress: string
  externalVendorId: string
  ensId: string
  sessionId: string
  validationStatus: string
  reportGenerationStatus: string
  finalStatus: string
  createTime: string
  updateTime: string
  overallStatus: Status
  orbisRetrievalStatus: string
  screeningModulesStatus: string
  existingEntity: 'EXISTING' | 'NEW'
  // Final accepted values (domestic / Probe42)
  entityType?: string
  identifier?: string
  identifierType?: string
  // Final accepted values (international / Orbis-Moody's)
  country?: string
  nationalId?: string
  nameInternational?: string
}