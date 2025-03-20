export interface TreeNode {
  fields: Set<string>;
  path: string;
  relations: Map<string, TreeNode>;
}

export type Tree = Map<string, TreeNode>;
