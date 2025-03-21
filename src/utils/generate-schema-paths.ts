import type { QuerySchemaDefinition, SchemaPaths } from '../interfaces';

/**
 * Generates a structured representation of all paths in a schema definition
 *
 * @param schema The schema definition to process
 * @param parentPath Optional parent path for recursive processing
 * @returns Structured schema paths object
 */
export function generateSchemaPaths<T>(
  schema: QuerySchemaDefinition<T, number>,
  parentPath: string = ''
): SchemaPaths {
  const result: SchemaPaths = {
    root: {
      selectable: [],
      sortable: []
    },
    relations: {
      selectable: [],
      sortable: [],
      keys: []
    }
  };

  // Handle top-level primitive fields
  if (!parentPath) {
    // Process selectable fields
    result.root.selectable = schema.selectableFields?.map((field) => field.toString()) ?? [];

    // Process sortable fields (use selectable as default if not specified)
    if (schema.sortableFields && schema.sortableFields.length > 0) {
      result.root.sortable = schema.sortableFields.map((field) => field.toString());
    } else {
      result.root.sortable = [...result.root.selectable];
    }
  }

  // Process relations
  if ('populate' in schema) {
    for (const relation in schema.populate) {
      const relationPath = parentPath ? `${parentPath}.${relation}` : relation;
      result.relations.keys.push(relationPath);

      const relationSchema = schema.populate[relation as never] as QuerySchemaDefinition<T, number>;

      // Process relation's selectable fields
      if (Array.isArray(relationSchema.selectableFields)) {
        for (const field of relationSchema.selectableFields) {
          const fieldPath = `${relationPath}.${field.toString()}`;
          result.relations.selectable.push(fieldPath);
        }
      }

      // Process relation's sortable fields
      if (Array.isArray(relationSchema.sortableFields)) {
        for (const field of relationSchema.sortableFields) {
          const fieldPath = `${relationPath}.${field.toString()}`;
          result.relations.sortable.push(fieldPath);
        }
      }

      if (Array.isArray(relationSchema.selectableFields)) {
        // Use selectable fields as default sortable fields if not specified
        for (const field of relationSchema.selectableFields) {
          const fieldPath = `${relationPath}.${field.toString()}`;
          result.relations.sortable.push(fieldPath);
        }
      }

      // Recursively process nested relations
      const subPaths = generateSchemaPaths(relationSchema, relationPath);

      // Merge nested relation data
      result.relations.keys.push(...subPaths.relations.keys);
      result.relations.selectable.push(...subPaths.relations.selectable);
      result.relations.sortable.push(...subPaths.relations.sortable);
    }
  }

  return {
    root: {
      selectable: [...new Set(result.root.selectable)],
      sortable: [...new Set(result.root.sortable)]
    },
    relations: {
      keys: [...new Set(result.relations.keys)],
      selectable: [...new Set(result.relations.selectable)],
      sortable: [...new Set(result.relations.sortable)]
    }
  };
}
