/**
 * Thin wrappers that re-export createScheduledVisit and createTask in a way
 * that lets ScheduleVisitModal import them without circular deps.
 */
export { createScheduledVisit, type ScheduledVisit } from "@/hooks/useScheduledVisits";
export { createTask } from "@/hooks/useTasks";
