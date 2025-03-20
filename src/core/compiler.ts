import { DEFAULT_INCLUDE_KEY, DEFAULT_SELECT_KEY, PATH_SEPARATOR } from '@/constants';
import type {
  QuerySchemaDefinition,
  SchemaPaths,
  StructuredQuery,
  Tree,
  TreeNode
} from '@/interfaces';
import { generateSchemaPaths } from '@/utils/generate-schema-paths';

import { TreeProcessor } from './tree-processor';

export interface CompileInput {
  includeKey?: string;
  populate: string[];
  selectableFields: string[];
  selectKey?: string;
}

/**
 * Compiles structured queries based on a schema definition
 */
export class StructuredQueryCompiler<T> {
  private readonly schemaPaths: SchemaPaths;

  private readonly treeProcessor: TreeProcessor;
  private constructor(schema: QuerySchemaDefinition<T>) {
    this.schemaPaths = generateSchemaPaths(schema);
    this.treeProcessor = new TreeProcessor();
  }

  public static forSchema<T>(schema: QuerySchemaDefinition<T>): StructuredQueryCompiler<T> {
    return new StructuredQueryCompiler<T>(schema);
  }

  /**
   * Compiles a structured query based on the provided input
   */
  public compile({
    populate,
    selectableFields,
    includeKey = DEFAULT_INCLUDE_KEY,
    selectKey = DEFAULT_SELECT_KEY
  }: CompileInput): StructuredQuery {
    // Build root fields selection
    const rootFields = this.compileRootFields(selectableFields, selectKey);

    // Filter and validate populate paths
    const validPopulatePaths = this.filterValidPaths(populate);

    // If no paths to populate, return just the root fields
    if (!validPopulatePaths.length) {
      return rootFields;
    }

    // Process the populate paths into a tree structure
    const tree = this.processRelationTree(validPopulatePaths);

    // Convert the tree to a query structure
    const relationQuery = this.convertTreeToQuery(tree, selectKey, includeKey);

    // Merge root fields with relations
    return this.mergeRootFieldsWithRelations(rootFields, relationQuery, includeKey);
  }

  /**
   * Compiles the root fields selection
   */
  private compileRootFields(selectableFields: string[], selectKey: string): StructuredQuery {
    const fields: Record<string, boolean> = {};

    for (const field of selectableFields) {
      const trimmedField = field.trim();

      if (this.schemaPaths.rootFields.includes(trimmedField)) {
        fields[trimmedField] = true;
      }
    }

    return {
      [selectKey]: fields
    };
  }

  /**
   * Filters out invalid paths from the populate array
   */
  private filterValidPaths(populate: string[]): string[] {
    return populate.filter(Boolean).filter((path) => this.isValidPath(path));
  }

  /**
   * Processes the relation paths into a tree structure
   */
  private processRelationTree(populatePaths: string[]): Tree {
    const tree = this.treeProcessor.process({
      populatePaths,
      schemaPaths: this.schemaPaths
    });

    return tree;
  }

  /**
   * Merges root fields with relation query
   */
  private mergeRootFieldsWithRelations(
    rootFields: StructuredQuery,
    relationQuery: StructuredQuery,
    includeKey: string
  ): StructuredQuery {
    const result = { ...rootFields };

    // Initialize empty relations object if none exists
    result[includeKey] = {};

    // Add relations if present
    if (relationQuery[includeKey]) {
      result[includeKey] = relationQuery[includeKey];
    }

    return result;
  }

  /**
   * Converts the relation tree to a structured query format
   */
  private convertTreeToQuery(tree: Tree, selectKey: string, includeKey: string): StructuredQuery {
    const query: StructuredQuery = {};
    const rootRelations: Record<string, StructuredQuery> = {};

    for (const [key, node] of tree) {
      rootRelations[key] = this.convertNodeToQuery(node, selectKey, includeKey);
    }

    if (Object.keys(rootRelations).length > 0) {
      query[includeKey] = rootRelations;
    }

    return query;
  }

  /**
   * Converts a single tree node to a structured query format
   */
  private convertNodeToQuery(
    node: TreeNode,
    selectKey: string,
    includeKey: string
  ): StructuredQuery {
    const nodeResult: StructuredQuery = {};

    // Add fields selection
    nodeResult[selectKey] = this.convertNodeFields(node);

    // Add relations if present
    if (node.relations.size > 0) {
      nodeResult[includeKey] = this.convertNodeRelations(node, selectKey, includeKey);
    }

    return nodeResult;
  }

  /**
   * Converts node fields to a fields selection object
   */
  private convertNodeFields(node: TreeNode): Record<string, boolean> {
    const fields: Record<string, boolean> = {};

    if (node.fields.size > 0) {
      for (const field of node.fields) {
        fields[field] = true;
      }
    }

    return fields;
  }

  /**
   * Converts node relations to a relations object
   */
  private convertNodeRelations(
    node: TreeNode,
    selectKey: string,
    includeKey: string
  ): Record<string, StructuredQuery> {
    const relations: Record<string, StructuredQuery> = {};

    for (const [key, relationNode] of node.relations) {
      relations[key] = this.convertNodeToQuery(relationNode, selectKey, includeKey);
    }

    return relations;
  }

  /**
   * Checks if a path is valid according to the schema
   */
  private isValidPath(path: string): boolean {
    // Direct match in relation fields
    if (this.schemaPaths.relationFields.includes(path)) {
      return true;
    }

    // Check path prefixes against relation keys
    return this.isValidPathPrefix(path);
  }

  /**
   * Checks if any prefix of the path is a valid relation key
   */
  private isValidPathPrefix(path: string): boolean {
    const parts = path.split(PATH_SEPARATOR);

    for (let i = 1; i <= parts.length; i++) {
      const prefix = parts.slice(0, i).join(PATH_SEPARATOR);

      if (this.schemaPaths.relationKeys.includes(prefix)) {
        return true;
      }
    }

    return false;
  }
}
