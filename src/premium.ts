/**
 * Premium / trial state management.
 *
 * Free users get the basic feature set unconditionally. A 7-day trial unlocks
 * Premium features starting from trial_start_ts (set on first install). After
 * the trial expires, Premium features are gated until the user purchases.
 *
 * No external calls — all state lives in chrome.storage.local.
 */

import { getStorage, setStorage, Task } from './storage';
import { countLeaves, countCompletedLeaves } from './checkbox-progress';

export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Free-tier hard cap on simultaneously stored top-level tasks. Premium /
 * trial users have no cap. Keep small enough that the limit feels real
 * but generous enough to evaluate the basic flow before deciding to buy.
 */
export const FREE_TIER_MAX_TASKS = 5;

export interface PremiumStatus {
  isPremium: boolean;
  isTrial: boolean;
  trialDaysRemaining: number;
  trialStartTs: number;
}

export interface DetailedStats {
  totalTasks: number;
  completedTasks: number;
  totalLeaves: number;
  completedLeaves: number;
  overallPercent: number;
}

function now(): number {
  return Date.now();
}

export async function getTrialStartTs(): Promise<number> {
  const data = await getStorage(['trial_start_ts']);
  const ts = data.trial_start_ts;
  if (typeof ts === 'number' && ts > 0) {
    return ts;
  }
  const fresh = now();
  await setStorage({ trial_start_ts: fresh });
  return fresh;
}

export async function isPremiumUnlocked(): Promise<boolean> {
  const data = await getStorage(['premium_unlocked']);
  return data.premium_unlocked === true;
}

export async function isTrialActive(currentTs: number = now()): Promise<boolean> {
  const start = await getTrialStartTs();
  return currentTs - start < TRIAL_DURATION_MS;
}

export async function getPremiumStatus(currentTs: number = now()): Promise<PremiumStatus> {
  const [unlocked, trialStartTs] = await Promise.all([
    isPremiumUnlocked(),
    getTrialStartTs()
  ]);
  const elapsed = currentTs - trialStartTs;
  const remaining = Math.max(0, TRIAL_DURATION_MS - elapsed);
  const trialDaysRemaining = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  const isTrial = !unlocked && elapsed < TRIAL_DURATION_MS;
  return {
    isPremium: unlocked || isTrial,
    isTrial,
    trialDaysRemaining: unlocked ? 0 : trialDaysRemaining,
    trialStartTs
  };
}

export async function unlockPremium(): Promise<void> {
  await setStorage({ premium_unlocked: true });
}

export async function lockPremium(): Promise<void> {
  await setStorage({ premium_unlocked: false });
}

/**
 * Returns true when a new top-level task can be added under current
 * premium status. Free users are capped at FREE_TIER_MAX_TASKS;
 * Premium / trial users have no cap.
 */
export function canAddTask(status: PremiumStatus, currentCount: number): boolean {
  if (status.isPremium) return true;
  return currentCount < FREE_TIER_MAX_TASKS;
}

/**
 * Aggregate task / subtask counts used by the Premium-only detailed
 * statistics panel. Pure — given the tasks array it returns the same
 * snapshot regardless of UI state.
 */
export function computeDetailedStats(tasks: Task[] | undefined): DetailedStats {
  const list = tasks || [];
  let totalLeaves = 0;
  let completedLeaves = 0;
  let completedTasks = 0;
  for (const task of list) {
    if (task.completed) completedTasks += 1;
    const leaves = countLeaves(task.subtasks);
    if (leaves === 0) {
      totalLeaves += 1;
      if (task.completed) completedLeaves += 1;
    } else {
      totalLeaves += leaves;
      completedLeaves += countCompletedLeaves(task.subtasks);
    }
  }
  const overallPercent =
    totalLeaves === 0 ? 0 : (completedLeaves / totalLeaves) * 100;
  return {
    totalTasks: list.length,
    completedTasks,
    totalLeaves,
    completedLeaves,
    overallPercent
  };
}
