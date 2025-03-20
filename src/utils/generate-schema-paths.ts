import type { QuerySchemaDefinition, SchemaPaths } from '@/interfaces';

export function generateSchemaPaths<T>(
  schema: QuerySchemaDefinition<T, number>,
  parentPath: string = ''
): SchemaPaths {
  const result: SchemaPaths = {
    relationFields: [],
    relationKeys: [],
    rootFields: []
  };

  // Handle top-level primitive fields
  if (!parentPath) {
    for (const field of schema.selectableFields ?? []) {
      result.rootFields.push(field.toString());
    }
  }

  // Process relations
  if ('populate' in schema) {
    for (const relation in schema.populate) {
      const relationPath = parentPath ? `${parentPath}.${relation}` : relation;
      result.relationKeys.push(relationPath);

      const relationSchema = schema.populate[relation as never] as QuerySchemaDefinition<T, number>;

      // Add specified relation fields
      if (Array.isArray(relationSchema.selectableFields)) {
        for (const field of relationSchema.selectableFields) {
          const fieldPath = `${relationPath}.${field.toString()}`;
          result.relationFields.push(fieldPath);
        }
      }

      // Recursively process deeper relations
      const subPaths = generateSchemaPaths(relationSchema, relationPath);

      // Add nested relation keys and fields
      result.relationKeys.push(...subPaths.relationKeys);
      result.relationFields.push(...subPaths.relationFields);
    }
  }

  return {
    rootFields: [...new Set(result.rootFields)],
    relationKeys: [...new Set(result.relationKeys)],
    relationFields: [...new Set(result.relationFields)]
  };
}
