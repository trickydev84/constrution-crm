// Not PRD-specified vocabularies — both lists are a reasonable default invented for this module,
// documented as an assumption rather than a spec requirement. See .ai/BE/features/worker-management.md.
export const WORKER_SKILL_CATEGORIES = ['MASON', 'ELECTRICIAN', 'PLUMBER', 'CARPENTER', 'PAINTER', 'MARBLE_WORKER', 'WELDER'] as const;
export type WorkerSkillCategory = (typeof WORKER_SKILL_CATEGORIES)[number];

export const WORKER_AVAILABILITY_STATUSES = ['AVAILABLE', 'ASSIGNED', 'ON_LEAVE', 'INACTIVE'] as const;
export type WorkerAvailabilityStatus = (typeof WORKER_AVAILABILITY_STATUSES)[number];
