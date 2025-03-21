/**
 * Node in the relation tree structure
 */
export interface TreeNode {
  /** Selected fields in this node */
  fields: Set<string>;

  /** Additional metadata for the node (e.g., sort options) */
  metadata?: Record<string, unknown>;

  /** Path to this node from the root */
  path: string;

  /** Child relations of this node */
  relations: Map<string, TreeNode>;
}

export type Tree = Map<string, TreeNode>;
