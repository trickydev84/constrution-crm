export enum Role { SUPERADMIN='SUPERADMIN', ADMIN='ADMIN', SALES='SALES', PROJECT_MANAGER='PROJECT_MANAGER', SUPERVISOR='SUPERVISOR', ACCOUNTANT='ACCOUNTANT', CUSTOMER='CUSTOMER' }
export enum Resource { LEADS='LEADS', CUSTOMERS='CUSTOMERS', PROJECTS='PROJECTS', QUOTATIONS='QUOTATIONS', WORKERS='WORKERS', MATERIALS='MATERIALS', USERS='USERS', PERMISSIONS='PERMISSIONS' }
export enum LeadStatus { NEW='NEW', CONTACTED='CONTACTED', SITE_VISIT='SITE_VISIT', QUOTATION_SENT='QUOTATION_SENT', NEGOTIATION='NEGOTIATION', WON='WON', LOST='LOST' }
export enum ProjectStage { PLANNING='PLANNING', FOUNDATION='FOUNDATION', STRUCTURE='STRUCTURE', BRICKWORK='BRICKWORK', PLUMBING='PLUMBING', ELECTRICAL='ELECTRICAL', FLOORING='FLOORING', PAINTING='PAINTING', INTERIOR='INTERIOR', INSPECTION='INSPECTION', HANDOVER='HANDOVER' }
export interface ApiResponse<T> { data: T; meta?: { page: number; limit: number; total: number } }
export interface ApiError { statusCode: number; message: string; code?: string; details?: unknown }
export interface Money { amount: number; currency: string }
export interface DateRange { from?: string; to?: string }
export interface FileMetadata { key: string; name: string; mimeType: string; size: number; url?: string }
export interface AuditEvent { actorId: string; organizationId: string; action: string; entity: string; entityId: string; createdAt: string }
