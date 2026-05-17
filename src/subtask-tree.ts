import { SubTask } from './storage';

/**
 * Design constants and helpers for the nested subtask tree feature.
 *
 * The subtask-tree feature extends the existing flat SubTask list with
 * optional children to allow nested decomposition (a subtask can have
 * its own subtasks). The implementation phase (T023) wires this into
 * the popup UI; this file is the design contract that implementation
 * and tests share.
 */

/**
 * Tree node type. Extends SubTask with an optional children array so
 * existing flat-list data remains valid (children is treated as []).
 */
export interface SubTaskNode extends SubTask {
  children?: SubTaskNode[];
}

export interface SubTaskTreeDesign {
  /** Maximum nesting depth (root subtask = depth 0). */
  maxDepth: number;
  /** Pixel indent applied per depth level in the popup UI. */
  indentPx: number;
  /** Whether collapsed state is persisted across popup open/close. */
  persistCollapsedState: boolean;
  /** Icon used as the add-child trigger button. */
  addChildIcon: string;
  /** Icon used to expand a collapsed node. */
  expandIcon: string;
  /** Icon used to collapse an expanded node. */
  collapseIcon: string;
}

export const subTaskTreeDesign: SubTaskTreeDesign = {
  maxDepth: 3,
  indentPx: 16,
  persistCollapsedState: false,
  addChildIcon: '➕',
  expandIcon: '▶',
  collapseIcon: '▼'
};

/**
 * Walk the tree depth-first and return all nodes flattened with depth.
 * Used by the renderer to produce an indented list.
 */
export function flattenTree(
  nodes: SubTaskNode[] | undefined,
  depth = 0
): Array<{ node: SubTaskNode; depth: number }> {
  if (!nodes || nodes.length === 0) return [];
  const out: Array<{ node: SubTaskNode; depth: number }> = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children && n.children.length > 0) {
      out.push(...flattenTree(n.children, depth + 1));
    }
  }
  return out;
}

/**
 * Count total nodes including descendants. Useful for progress.
 */
export function countNodes(nodes: SubTaskNode[] | undefined): number {
  if (!nodes || nodes.length === 0) return 0;
  let n = 0;
  for (const node of nodes) {
    n += 1 + countNodes(node.children);
  }
  return n;
}

/**
 * Count completed nodes including descendants.
 */
export function countCompleted(nodes: SubTaskNode[] | undefined): number {
  if (!nodes || nodes.length === 0) return 0;
  let n = 0;
  for (const node of nodes) {
    if (node.completed) n += 1;
    n += countCompleted(node.children);
  }
  return n;
}

/**
 * Find a node by id, returning the parent array (so callers can mutate).
 * Returns null if not found.
 */
export function findNode(
  nodes: SubTaskNode[] | undefined,
  id: string
): { parentList: SubTaskNode[]; index: number; node: SubTaskNode } | null {
  if (!nodes) return null;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      return { parentList: nodes, index: i, node: nodes[i] };
    }
    const found = findNode(nodes[i].children, id);
    if (found) return found;
  }
  return null;
}
