import { DEFAULT_INCLUDE_KEY, DEFAULT_SELECT_KEY, DEFAULT_SORT_KEY } from '../constants';
import type {
  CompileOptions,
  EmptyRootFieldsBehavior,
  QuerySchemaDefinition,
  SchemaPaths,
  StructuredQuery,
  Tree,
  TreeNode
} from '../interfaces';
import { generateSchemaPaths } from '../utils/generate-schema-paths';
import { isEmptyObject } from '../utils/predicates';
import { TreeProcessor } from './tree-processor';

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
    selectKey = DEFAULT_SELECT_KEY,
    sortKey = DEFAULT_SORT_KEY,
    emptyRootFieldsBehavior = 'returnAll'
  }: CompileOptions): StructuredQuery {
    // Build root fields selection
    const rootFields = this.compileRootFields({
      selectKey,
      selectableFields,
      emptyRootFieldsBehavior
    });

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
  private compileRootFields({
    selectableFields,
    selectKey,
    emptyRootFieldsBehavior
  }: {
    emptyRootFieldsBehavior: EmptyRootFieldsBehavior;
    selectableFields: string[];
    selectKey: string;
  }): StructuredQuery {
    if (!selectableFields.length && emptyRootFieldsBehavior === 'leaveEmpty') {
      return {
        [selectKey]: {}
      };
    }

    const fields: Record<string, boolean> = {};

    for (const field of selectableFields.length ? selectableFields : this.schemaPaths.rootFields) {
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

    if (!isEmptyObject(rootRelations)) {
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

    const convertedNodeFields = this.convertNodeFields(node);

    if (!isEmptyObject(convertedNodeFields)) {
      // Add fields selection
      nodeResult[selectKey] = convertedNodeFields;
    }

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
    if (
      this.schemaPaths.relationFields.includes(path) ||
      this.schemaPaths.relationKeys.includes(path)
    ) {
      return true;
    }

    return false;

    // console.log({
    //   path,
    //   test: this.schemaPaths.relationFields.includes(path)
    // });

    // // Direct match in relation fields
    // if (this.schemaPaths.relationFields.includes(path)) {
    //   return true;
    // }

    // // Check path prefixes against relation keys
    // return this.isValidPathPrefix(path);
  }
}
