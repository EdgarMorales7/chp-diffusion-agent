export type QueueStatus =
  | 'Draft'
  | 'Planned'
  | 'Ready'
  | 'Approved'
  | 'Today'
  | 'Published'
  | 'Skipped'
  | 'Cancelled';

export type QueuePriority = 'Low' | 'Medium' | 'High';

export const VALID_STATUSES: readonly QueueStatus[] = [
  'Draft',
  'Planned',
  'Ready',
  'Approved',
  'Today',
  'Published',
  'Skipped',
  'Cancelled',
];

export const TERMINAL_STATUSES: readonly QueueStatus[] = [
  'Published',
  'Skipped',
  'Cancelled',
];

export const ACTIONABLE_STATUSES: readonly QueueStatus[] = [
  'Today',
  'Approved',
  'Ready',
  'Planned',
];

export const PRIORITY_WEIGHTS: Record<string, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

export const VALID_TRANSITIONS: Record<QueueStatus, QueueStatus[]> = {
  Draft: ['Planned', 'Ready', 'Cancelled'],
  Planned: ['Ready', 'Today', 'Approved', 'Skipped', 'Cancelled'],
  Ready: ['Approved', 'Today', 'Skipped', 'Cancelled', 'Published'],
  Approved: ['Today', 'Ready', 'Published', 'Skipped', 'Cancelled'],
  Today: ['Published', 'Skipped', 'Cancelled', 'Approved', 'Ready'],
  Published: [],
  Skipped: [],
  Cancelled: [],
};

export function isValidStatus(status: string): status is QueueStatus {
  return VALID_STATUSES.includes(status as QueueStatus);
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL_STATUSES.includes(status as QueueStatus);
}

export function isActionableStatus(status: string): boolean {
  return ACTIONABLE_STATUSES.includes(status as QueueStatus);
}

export function canTransition(from: QueueStatus, to: QueueStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getTodayRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export function isTaskForToday(scheduledFor: string | Date): boolean {
  const d = new Date(scheduledFor);
  const { start, end } = getTodayRange();
  return d >= start && d <= end;
}

export function isTaskOverdueOrToday(scheduledFor: string | Date): boolean {
  const d = new Date(scheduledFor);
  const { end } = getTodayRange();
  return d <= end;
}

export interface TaskCandidate {
  id: string;
  status: string;
  priority: string;
  scheduled_for: string;
}

/**
 * Pure function to select the next actionable task from a collection of tasks.
 * Applies:
 * 1. Exclusion of current task
 * 2. Only valid actionable statuses (Today, Approved, Ready, Planned)
 * 3. Exclusion of terminal statuses and Draft/invalid states
 * 4. scheduled_for <= todayEnd
 * 5. Order by Priority (High: 3 > Medium: 2 > Low: 1)
 * 6. Tie-breaker: scheduled_for ASC
 */
export function selectNextTask<T extends TaskCandidate>(
  tasks: T[],
  currentId: string,
  todayEnd?: Date | string
): T | null {
  const maxDate = todayEnd ? new Date(todayEnd) : getTodayRange().end;

  const eligible = tasks.filter((t) => {
    // 1. Exclude current task
    if (t.id === currentId) return false;

    // 2. Must be an actionable valid status
    if (!isActionableStatus(t.status)) return false;

    // 3. Must be scheduled for today or overdue
    const sched = new Date(t.scheduled_for);
    if (isNaN(sched.getTime()) || sched > maxDate) return false;

    return true;
  });

  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const pA = PRIORITY_WEIGHTS[a.priority] || 0;
    const pB = PRIORITY_WEIGHTS[b.priority] || 0;
    if (pA !== pB) return pB - pA; // High before Medium before Low
    return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
  });

  return eligible[0] || null;
}
