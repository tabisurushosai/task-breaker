import { SubTaskNode } from './subtask-tree';

/**
 * Design constants and helpers for the checkbox / progress feature.
 *
 * The checkbox-progress feature adds:
 *  - a real checkbox control on each task and subtask row,
 *  - a percentage progress indicator on each parent task derived from
 *    the completion state of its (nested) subtask tree,
 *  - cascade rules: toggling a parent node propagates the state to all
 *    descendants; a parent is considered "completed" only when every
 *    descendant is completed.
 *
 * This file is the shared contract used by the implementation phase
 * (T026) and the test/integrity phase (T027). It is intentionally
 * pure (no DOM / chrome API) so it can be unit-tested in isolation.
 */

export interface CheckboxProgressDesign {
  /** Number of decimals shown in the percent label (e.g. 1 => "42.5%"). */
  percentDecimals: number;
  /** When true, toggling a parent cascades the new state to descendants. */
  cascadeOnToggle: boolean;
  /**
   * When true, a parent is auto-marked completed if all its descendants
   * are completed (and auto-uncompleted if any becomes incomplete).
   */
  autoCompleteParent: boolean;
  /** ARIA label key used for the checkbox in the popup UI. */
  ariaLabelKey: string;
}

export const checkboxProgressDesign: CheckboxProgressDesign = {
  percentDecimals: 0,
  cascadeOnToggle: true,
  autoCompleteParent: true,
  ariaLabelKey: 'popup_toggle_complete'
};

/**
 * Recursively cascade `completed` to a node and all its descendants.
 * Pure: returns nothing; mutates in place because callers already work
 * on a deep-cloned tasks array before persisting.
 */
export function cascadeComplete(node: SubTaskNode, completed: boolean): void {
  node.completed = completed;
  if (node.children) {
    for (const child of node.children) {
      cascadeComplete(child, completed);
    }
  }
}

/**
 * Returns true when the node has at least one descendant and every
 * descendant (at every depth) is completed.
 */
export function allDescendantsCompleted(node: SubTaskNode): boolean {
  if (!node.children || node.children.length === 0) return false;
  for (const child of node.children) {
    if (!child.completed) return false;
    if (child.children && child.children.length > 0 && !allDescendantsCompleted(child)) {
      return false;
    }
  }
  return true;
}

/**
 * Recompute the `completed` field of every parent node based on its
 * descendants, when `autoCompleteParent` is enabled. Leaves leaf nodes
 * untouched.
 */
export function recomputeParentCompletion(nodes: SubTaskNode[] | undefined): void {
  if (!nodes) return;
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      recomputeParentCompletion(node.children);
      node.completed = allDescendantsCompleted(node);
    }
  }
}

/**
 * Count leaf nodes (nodes with no children) in the tree.
 * Progress percentages are computed against leaves only so that adding
 * a sub-decomposition under an existing leaf does not regress the
 * displayed percentage in a confusing way.
 */
export function countLeaves(nodes: SubTaskNode[] | undefined): number {
  if (!nodes || nodes.length === 0) return 0;
  let n = 0;
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) {
      n += 1;
    } else {
      n += countLeaves(node.children);
    }
  }
  return n;
}

/**
 * Count completed leaf nodes.
 */
export function countCompletedLeaves(nodes: SubTaskNode[] | undefined): number {
  if (!nodes || nodes.length === 0) return 0;
  let n = 0;
  for (const node of nodes) {
    if (!node.children || node.children.length === 0) {
      if (node.completed) n += 1;
    } else {
      n += countCompletedLeaves(node.children);
    }
  }
  return n;
}

/**
 * Compute a 0..100 progress percentage for a subtask tree.
 * Returns 0 when there are no leaves (no subtasks).
 */
export function computeProgressPercent(nodes: SubTaskNode[] | undefined): number {
  const total = countLeaves(nodes);
  if (total === 0) return 0;
  const done = countCompletedLeaves(nodes);
  return (done / total) * 100;
}

/**
 * Format a 0..100 percent value using the configured decimals.
 */
export function formatPercent(percent: number): string {
  const decimals = checkboxProgressDesign.percentDecimals;
  return `${percent.toFixed(decimals)}%`;
}
