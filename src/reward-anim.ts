import { SubTaskNode } from './subtask-tree';
import {
  computeProgressPercent,
  countLeaves,
  countCompletedLeaves
} from './checkbox-progress';

/**
 * Design constants and pure helpers for the reward-anim feature.
 *
 * The reward-anim feature plays a short celebratory animation when the
 * user reaches a meaningful completion milestone. It is intentionally
 * lightweight (CSS keyframes + a transient overlay element) so it works
 * inside the constrained popup canvas without external assets and stays
 * within Chrome Web Store / MV3 size budgets.
 *
 * Milestones (decided here, applied by impl phase T029):
 *  - "leaf"  : a leaf subtask was just toggled from incomplete -> complete
 *              and the parent task is not yet 100%. Light feedback.
 *  - "task"  : a top-level task just transitioned to 100% (i.e. the very
 *              last leaf got checked, or a task with no subtasks was
 *              checked). Full reward animation.
 *  - "none"  : every other state change. No animation.
 *
 * Why a discrete enum: it lets the popup decide once per toggle which
 * tier to play, keeping the DOM work and accessibility announcements
 * scoped to the actual event instead of re-running on every render.
 *
 * This file is the shared contract used by T029 (impl) and T030
 * (test/integrity). It MUST stay pure (no DOM, no chrome API) so the
 * milestone decision can be unit-tested in isolation.
 */

export type RewardTier = 'none' | 'leaf' | 'task';

export interface RewardAnimDesign {
  /** Total visible duration of the overlay element, in ms. */
  durationMs: number;
  /** Duration of the "leaf" tier feedback, in ms. */
  leafDurationMs: number;
  /** Emoji rendered inside the overlay for the "task" tier. */
  taskEmoji: string;
  /** Emoji rendered inside the overlay for the "leaf" tier. */
  leafEmoji: string;
  /** Number of confetti particles for the "task" tier (0 disables). */
  confettiCount: number;
  /**
   * When true, the feature honors `prefers-reduced-motion: reduce` and
   * downgrades any animation to a brief non-moving flash + aria-live
   * announcement only. Required for accessibility compliance.
   */
  respectReducedMotion: boolean;
  /**
   * When true, the overlay element receives `role="status"` and
   * `aria-live="polite"` so screen readers announce the milestone via
   * the `popup_reward_*` i18n strings.
   */
  ariaAnnounce: boolean;
  /** i18n key for the screen-reader announcement on a "task" milestone. */
  taskAnnounceKey: string;
  /** i18n key for the screen-reader announcement on a "leaf" milestone. */
  leafAnnounceKey: string;
  /** CSS class name applied to the overlay root element. */
  overlayClass: string;
  /** CSS class name applied to each confetti particle. */
  confettiClass: string;
}

export const rewardAnimDesign: RewardAnimDesign = {
  durationMs: 1400,
  leafDurationMs: 600,
  taskEmoji: '🎉',
  leafEmoji: '✨',
  confettiCount: 18,
  respectReducedMotion: true,
  ariaAnnounce: true,
  taskAnnounceKey: 'popup_reward_task_complete',
  leafAnnounceKey: 'popup_reward_leaf_complete',
  overlayClass: 'reward-overlay',
  confettiClass: 'reward-confetti'
};

/**
 * Snapshot of the bits of a top-level task that matter for reward
 * decisions. Kept minimal so callers don't need to pass the whole task
 * (and so tests can fabricate inputs cheaply).
 */
export interface TaskRewardSnapshot {
  /** Top-level `completed` flag of the task. */
  completed: boolean;
  /** The task's subtask tree (may be empty). */
  subtasks: SubTaskNode[];
}

/**
 * Decide which reward tier (if any) to play given the task state
 * *before* and *after* the toggle. Pure: no side effects.
 *
 * Rules:
 *  - If percent went from <100 to ===100, return "task".
 *  - Else if at least one additional leaf became completed, return
 *    "leaf" (light feedback so progress feels rewarding even when the
 *    whole tree isn't done).
 *  - Else (uncheck, no change, regression) return "none".
 *
 * The "task" check uses computeProgressPercent so it correctly handles
 * the no-subtask case (countLeaves === 0): in that case we fall back to
 * the top-level `completed` flag transitioning false -> true.
 */
export function decideRewardTier(
  before: TaskRewardSnapshot,
  after: TaskRewardSnapshot
): RewardTier {
  const beforeLeaves = countLeaves(before.subtasks);
  const afterLeaves = countLeaves(after.subtasks);

  // No-subtask task: completion is driven by the top-level flag only.
  if (beforeLeaves === 0 && afterLeaves === 0) {
    return !before.completed && after.completed ? 'task' : 'none';
  }

  const beforePct = computeProgressPercent(before.subtasks);
  const afterPct = computeProgressPercent(after.subtasks);

  if (beforePct < 100 && afterPct === 100) return 'task';

  const beforeDone = countCompletedLeaves(before.subtasks);
  const afterDone = countCompletedLeaves(after.subtasks);
  if (afterDone > beforeDone) return 'leaf';

  return 'none';
}

/**
 * Returns the visible duration in ms for a given tier. Centralized so
 * impl and tests agree on cleanup timing.
 */
export function rewardDurationFor(tier: RewardTier): number {
  switch (tier) {
    case 'task':
      return rewardAnimDesign.durationMs;
    case 'leaf':
      return rewardAnimDesign.leafDurationMs;
    default:
      return 0;
  }
}

/**
 * Returns the emoji glyph used for a given tier (empty string for none).
 */
export function rewardEmojiFor(tier: RewardTier): string {
  switch (tier) {
    case 'task':
      return rewardAnimDesign.taskEmoji;
    case 'leaf':
      return rewardAnimDesign.leafEmoji;
    default:
      return '';
  }
}

/**
 * Returns the i18n message key the renderer should pass to chrome.i18n
 * for the aria-live announcement of a given tier (empty for none).
 */
export function rewardAnnounceKeyFor(tier: RewardTier): string {
  switch (tier) {
    case 'task':
      return rewardAnimDesign.taskAnnounceKey;
    case 'leaf':
      return rewardAnimDesign.leafAnnounceKey;
    default:
      return '';
  }
}
