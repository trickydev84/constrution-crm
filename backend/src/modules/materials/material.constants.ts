// Not PRD-specified as an enum — the Master Plan just lists example materials (cement, sand, steel,
// bricks, marble, tiles, paint). This list is a reasonable default invented for this module, documented as
// an assumption rather than a spec requirement, matching worker.constants.ts's precedent.
export const MATERIAL_CATEGORIES = ['CEMENT', 'SAND', 'STEEL', 'BRICKS', 'MARBLE', 'TILES', 'PAINT', 'OTHER'] as const;
export type MaterialCategory = (typeof MATERIAL_CATEGORIES)[number];

export const MATERIAL_REQUEST_STATUSES = ['REQUESTED', 'APPROVED', 'FULFILLED', 'REJECTED'] as const;
export type MaterialRequestStatus = (typeof MATERIAL_REQUEST_STATUSES)[number];
