import {
  DEFAULT_INCLUDE_KEY,
  DEFAULT_SELECT_KEY,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_KEY,
  PATH_SEPARATOR,
  SortDirection
} from '../constants';
import type {
  CompileOptions,
  QuerySchemaDefinition,
  SchemaPaths,
  SortOption,
  SortQueryPart,
  StructuredQuery,
  Tree,
  TreeNode
} from '../interfaces';
import { isEnumValue } from '../utils/enums';
import { generateSchemaPaths } from '../utils/generate-schema-paths';
import { TreeProcessor } from './tree-processor';

export type EmptyRootFieldsBehavior = 'leaveEmpty' | 'returnAll';

// TODO - fix errors

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

  /**
   * Creates a new compiler instance for the given schema
   *
   * @param schema The schema definition to use for compilation
   * @returns A new StructuredQueryCompiler instance
   */
  public static forSchema<T>(schema: QuerySchemaDefinition<T>): StructuredQueryCompiler<T> {
    return new StructuredQueryCompiler<T>(schema);
  }

  /**
   * Compiles a structured query based on the provided input
   *
   * @param options Compilation options
   * @returns A structured query object
   */
  public compile({
    populate,
    selectableFields,
    includeKey = DEFAULT_INCLUDE_KEY,
    selectKey = DEFAULT_SELECT_KEY,
    emptyRootFieldsBehavior = 'returnAll',
    sort,
    sortKey = DEFAULT_SORT_KEY
  }: CompileOptions): StructuredQuery {
    // Build root fields selection
    const rootFields = this.compileRootFields({
      selectKey,
      selectableFields,
      emptyRootFieldsBehavior
    });

    // Filter and validate populate paths
    const validPopulatePaths = this.filterValidPaths(populate);

    // Process the populate paths into a tree structure
    const tree =
      validPopulatePaths.length > 0
        ? this.processRelationTree(validPopulatePaths)
        : new Map<string, TreeNode>();

    // Compile sort options (both root and nested)
    const sortResult = this.compileSortOptions({
      sort,
      sortKey,
      tree
    });

    // If no paths to populate, return just the root fields with sort
    if (!validPopulatePaths.length) {
      return { ...rootFields, ...(sortResult.rootSort ?? {}) } as StructuredQuery;
    }

    // Convert the tree to a query structure
    const relationQuery = this.convertTreeToQuery(tree, selectKey, includeKey, sortKey);

    // Merge root fields with relations and sort options
    return {
      ...this.mergeRootFieldsWithRelations(rootFields, relationQuery, includeKey),
      ...(sortResult.rootSort ?? {})
    } as StructuredQuery;
  }

  /**
   * Compiles the root fields selection
   *
   * @param selectableFields Fields to select
   * @param selectKey The key to use for the selection in the query
   * @param emptyRootFieldsBehavior Behavior when no fields are selected
   * @returns Structured query with root fields
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

    // Use either the provided fields or all fields from schema
    const fieldsToSelect = selectableFields.length
      ? selectableFields
      : this.schemaPaths.root.selectable;

    for (const field of fieldsToSelect) {
      const trimmedField = field.trim();

      // Check if field is valid in the schema
      if (this.schemaPaths.root.selectable.includes(trimmedField)) {
        fields[trimmedField] = true;
      }
    }

    return {
      [selectKey]: fields
    };
  }

  /**
   * Compiles sort options into query parts, handling both root and nested sorting
   *
   * @param sort The sort options to compile
   * @param sortKey The key to use for the sort in the query
   * @param tree The relation tree structure for nested sorts
   * @returns Object containing root and nested sort configurations
   */
  private compileSortOptions({
    sort,
    sortKey,
    tree
  }: {
    sort?: SortOption | SortOption[];
    sortKey: string;
    tree: Tree;
  }): { rootSort: SortQueryPart | null } {
    if (!sort) {
      return { rootSort: null };
    }

    // Convert single sort option to array
    const sortOptions = Array.isArray(sort) ? sort : [sort];

    if (sortOptions.length === 0) {
      return { rootSort: null };
    }

    const rootSortObject: Record<string, SortDirection> = {};

    for (const option of sortOptions) {
      const field = option.field.trim();
      const direction: SortDirection = isEnumValue(option.direction, SortDirection)
        ? option.direction
        : option.direction
          ? SortDirection[option.direction]
          : DEFAULT_SORT_DIRECTION;

      // Check if it's a nested path
      if (field.includes(PATH_SEPARATOR)) {
        this.processNestedSortField(field, direction, tree, sortKey);
      }
      // It's a root field
      else if (this.schemaPaths.root.sortable.includes(field)) {
        rootSortObject[field] = direction;
      }
    }

    // Return root sort object or null if empty
    const rootSort = Object.keys(rootSortObject).length > 0 ? { [sortKey]: rootSortObject } : null;

    return { rootSort };
  }

  /**
   * Processes a nested sort field and adds it to the appropriate node in the tree
   *
   * @param fieldPath Full path to the field (e.g. "posts.comments.createdAt")
   * @param direction Sort direction
   * @param tree The relation tree
   * @param sortKey The key to use for sort in the query
   */
  private processNestedSortField(
    fieldPath: string,
    direction: SortDirection,
    tree: Tree,
    sortKey: string
  ): void {
    const parts = fieldPath.split(PATH_SEPARATOR);

    // We need at least a relation and a field (e.g. "posts.title")
    if (parts.length < 2) {
      return;
    }

    const path = parts[0];
    const sortField = parts[parts.length - 1];

    if (!path || !sortField) {
      return;
    }

    // Find the node for the relation path
    let currentNode: TreeNode | undefined = tree.get(path);

    // If the relation doesn't exist in the tree, we can't sort on it
    if (!currentNode) {
      return;
    }

    // Navigate through the tree to find the node for the relation
    for (let i = 1; i < parts.length - 1; i++) {
      currentNode = currentNode.relations.get(parts[i] ?? '');
      if (!currentNode) {
        return;
      }
    }

    // Check if the field is sortable in this relation
    if (!this.schemaPaths.relations.sortable.includes(fieldPath)) {
      return;
    }

    // Add sort metadata to the node
    if (!currentNode.metadata) {
      currentNode.metadata = {};
    }

    if (!currentNode.metadata[sortKey]) {
      currentNode.metadata[sortKey] = {};
    }

    // Add the sort field to the node metadata
    (currentNode.metadata[sortKey] as Record<string, SortDirection>)[sortField] = direction;
  }

  /**
   * Filters out invalid paths from the populate array
   *
   * @param populate The paths to filter
   * @returns Array of valid paths
   */
  private filterValidPaths(populate: string[]): string[] {
    return populate.filter(Boolean).filter((path) => this.isValidPath(path));
  }

  /**
   * Checks if a path is valid according to the schema
   *
   * @param path The path to validate
   * @returns True if the path is valid, false otherwise
   */
  private isValidPath(path: string): boolean {
    // Check if path is a valid relation field
    if (this.schemaPaths.relations.selectable.includes(path)) {
      return true;
    }

    // Check if path is a valid relation key
    if (this.schemaPaths.relations.keys.includes(path)) {
      return true;
    }

    return false;
  }

  /**
   * Processes the relation paths into a tree structure
   *
   * @param populatePaths Array of relation paths to process
   * @returns Tree representation of relations
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
   *
   * @param rootFields Root fields query
   * @param relationQuery Relations query
   * @param includeKey The key to use for relations
   * @returns Merged query
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
   *
   * @param tree The relation tree
   * @param selectKey The key to use for field selection
   * @param includeKey The key to use for relations
   * @param sortKey The key to use for sorting
   * @returns Structured query
   */
  private convertTreeToQuery(
    tree: Tree,
    selectKey: string,
    includeKey: string,
    sortKey: string
  ): StructuredQuery {
    const query: StructuredQuery = {};
    const rootRelations: Record<string, StructuredQuery> = {};

    for (const [key, node] of tree) {
      rootRelations[key] = this.convertNodeToQuery(node, selectKey, includeKey, sortKey);
    }

    if (Object.keys(rootRelations).length > 0) {
      query[includeKey] = rootRelations;
    }

    return query;
  }

  /**
   * Converts a single tree node to a structured query format
   *
   * @param node The tree node to convert
   * @param selectKey The key to use for field selection
   * @param includeKey The key to use for relations
   * @param sortKey The key to use for sorting
   * @returns Structured query for the node
   */
  private convertNodeToQuery(
    node: TreeNode,
    selectKey: string,
    includeKey: string,
    sortKey: string
  ): StructuredQuery {
    const nodeResult: StructuredQuery = {};

    const convertedNodeFields = this.convertNodeFields(node);

    if (Object.keys(convertedNodeFields).length > 0) {
      // Add fields selection
      nodeResult[selectKey] = convertedNodeFields;
    }

    // Add metadata if present (including sort options)
    if (node.metadata) {
      for (const [key, value] of Object.entries(node.metadata)) {
        nodeResult[key] = value as Record<string, boolean> | Record<string, StructuredQuery>;
      }
    }

    // Add relations if present
    if (node.relations.size > 0) {
      nodeResult[includeKey] = this.convertNodeRelations(node, selectKey, includeKey, sortKey);
    }

    return nodeResult;
  }

  /**
   * Converts node fields to a fields selection object
   *
   * @param node The tree node
   * @returns Record of fields with boolean values
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
   *
   * @param node The tree node
   * @param selectKey The key to use for field selection
   * @param includeKey The key to use for relations
   * @param sortKey The key to use for sorting
   * @returns Record of relation names to structured queries
   */
  private convertNodeRelations(
    node: TreeNode,
    selectKey: string,
    includeKey: string,
    sortKey: string
  ): Record<string, StructuredQuery> {
    const relations: Record<string, StructuredQuery> = {};

    for (const [key, relationNode] of node.relations) {
      relations[key] = this.convertNodeToQuery(relationNode, selectKey, includeKey, sortKey);
    }

    return relations;
  }
}
