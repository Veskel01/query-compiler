import { PATH_SEPARATOR } from '@/constants';
import type { SchemaPaths, Tree, TreeNode } from '@/interfaces';

export interface ProcessTreeInput {
  populatePaths: string[];
  schemaPaths: SchemaPaths;
}

/**
 * Class responsible for processing relation paths and constructing their tree representation
 */
export class TreeProcessor {
  /**
   * Process the populate paths and construct a tree representation
   * @param populatePaths Array of populate paths
   * @param schemaPaths Schema paths to validate against
   * @returns Map of root relation nodes
   */
  public process({ populatePaths, schemaPaths }: ProcessTreeInput): Tree {
    const tree = new Map<string, TreeNode>();
    const relationsWithExplicitFields = this.identifyExplicitFields(populatePaths, schemaPaths);

    this.constructTreeStructure(populatePaths, schemaPaths, tree);

    this.enrichRelationsWithFields(tree, populatePaths, schemaPaths, relationsWithExplicitFields);

    return tree;
  }

  /**
   * Step 1: Identify relations that have explicit fields in populate
   */
  private identifyExplicitFields(
    populatePaths: string[],
    schemaPaths: SchemaPaths
  ): Map<string, Set<string>> {
    const relationsWithExplicitFields = new Map<string, Set<string>>();

    for (const param of populatePaths) {
      // Skip paths that are not fields
      if (!param.includes(PATH_SEPARATOR)) {
        continue;
      }

      const parts = param.split(PATH_SEPARATOR);
      const fieldName = parts[parts.length - 1];
      const relationPath = parts.slice(0, parts.length - 1).join(PATH_SEPARATOR);

      if (!fieldName) {
        continue;
      }

      // Check if this is a field in the schema
      if (schemaPaths.relationFields.includes(param)) {
        if (!relationsWithExplicitFields.has(relationPath)) {
          relationsWithExplicitFields.set(relationPath, new Set());
        }
        relationsWithExplicitFields.get(relationPath)?.add(fieldName);
      }
    }

    return relationsWithExplicitFields;
  }

  /**
   * Step 2: Construct the tree structure based on populate paths
   */
  private constructTreeStructure(
    populatePaths: string[],
    schemaPaths: SchemaPaths,
    tree: Map<string, TreeNode>
  ): void {
    for (const param of populatePaths) {
      const parts = param.split(PATH_SEPARATOR);

      if (parts.length === 0) {
        continue;
      }

      // Create root node if it doesn't exist
      const rootKey = parts[0];

      if (!rootKey) {
        continue;
      }

      if (!tree.has(rootKey)) {
        tree.set(rootKey, this.createNode(rootKey));
      }

      // If it's just the root, continue to next path
      if (parts.length === 1) {
        continue;
      }

      // Process the parts to build the tree
      let currentNode = tree.get(rootKey);
      let currentPath = rootKey;

      for (let i = 1; i < parts.length; i++) {
        const part = parts[i];

        if (!part || !currentNode) {
          continue;
        }

        currentPath = `${currentPath}${PATH_SEPARATOR}${part}`;

        // If this is the last part, it could be a field or a relation
        if (i === parts.length - 1) {
          // Check if this is a field of the current relation
          if (schemaPaths.relationFields.includes(currentPath)) {
            currentNode.fields.add(part);
          }
          // Otherwise it's a relation
          else if (!currentNode.relations.has(part)) {
            currentNode.relations.set(part, this.createNode(currentPath));
          }
        }
        // If not the last part, it must be a relation
        else {
          if (!currentNode.relations.has(part)) {
            currentNode.relations.set(part, this.createNode(currentPath));
          }

          currentNode = currentNode.relations.get(part);
        }
      }
    }
  }

  /**
   * Step 3: Enrich relations with fields from schema when needed
   */
  private enrichRelationsWithFields(
    tree: Map<string, TreeNode>,
    populatePaths: string[],
    schemaPaths: SchemaPaths,
    relationsWithExplicitFields: Map<string, Set<string>>
  ): void {
    for (const [key, node] of tree) {
      this.processNode(node, key, populatePaths, schemaPaths, relationsWithExplicitFields);
    }
  }

  /**
   * Process a single node to add fields if needed
   */
  private processNode(
    node: TreeNode,
    path: string,
    populatePaths: string[],
    schemaPaths: SchemaPaths,
    relationsWithExplicitFields: Map<string, Set<string>>
  ): void {
    // Skip relations that have explicit fields
    const hasExplicitFields = relationsWithExplicitFields.has(path);

    // If this relation appears directly in populate but has no explicit fields,
    // AND there are no explicit field references for this relation,
    // then add all fields from schema
    if (!hasExplicitFields && populatePaths.includes(path) && node.fields.size === 0) {
      // Find all direct fields for this relation from schema
      for (const fieldPath of schemaPaths.relationFields) {
        if (fieldPath.startsWith(`${path}${PATH_SEPARATOR}`)) {
          const fieldName = fieldPath.substring(path.length + 1);
          if (!fieldName.includes(PATH_SEPARATOR)) {
            // Ensure it's a direct field, not a nested path
            node.fields.add(fieldName);
          }
        }
      }
    }

    // Process child relations recursively
    for (const [_, relationNode] of node.relations) {
      this.processNode(
        relationNode,
        relationNode.path,
        populatePaths,
        schemaPaths,
        relationsWithExplicitFields
      );
    }
  }

  /**
   * Create a new tree node with the given path
   */
  private createNode(path: string): TreeNode {
    return {
      path,
      fields: new Set(),
      relations: new Map()
    };
  }
}
