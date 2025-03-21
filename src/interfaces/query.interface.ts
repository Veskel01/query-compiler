export type SchemaPrimitiveValue = Date | bigint | boolean | number | string | null | undefined;

// Helper type to decrease the depth counter
type Decremented = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// Helper to get primitive keys
type PrimitiveKeys<T> = {
  [K in keyof T]: T[K] extends SchemaPrimitiveValue ? K : never;
}[keyof T];

// Helper to get object keys, including optional ones
type ObjectKeys<T> = {
  [K in keyof T]: NonNullable<T[K]> extends SchemaPrimitiveValue ? never : K;
}[keyof T];

// Type to check if object has object properties
type HasObjectProperties<T> = ObjectKeys<T> extends never ? false : true;

/**
 * Definition of a query schema with relationships and selectable fields
 */
export type QuerySchemaDefinition<T, TDepth extends number = 5> = {
  /** Fields that can be selected at the root level */
  selectableFields?: Array<PrimitiveKeys<T>>;
  /** Fields that can be used for sorting at the root level */
  sortableFields?: Array<PrimitiveKeys<T>>;
} & (HasObjectProperties<T> extends true
  ? TDepth extends 0
    ? {} // Stop recursion when depth is 0
    : {
        /** Definition of related entities */
        populate?: {
          [K in ObjectKeys<T>]?: NonNullable<T[K]> extends Array<infer U>
            ? QuerySchemaDefinition<NonNullable<U>, Decremented[TDepth]>
            : NonNullable<T[K]> extends object
              ? QuerySchemaDefinition<NonNullable<T[K]>, Decremented[TDepth]>
              : never;
        };
      }
  : {});

/**
 * Represents fields at the root level of the schema
 */
export interface SchemaRootFields {
  /** Fields that can be selected at the root level */
  selectable: string[];

  /** Fields that can be used for sorting at the root level */
  sortable: string[];
}

/**
 * Represents fields in relations
 */
export interface SchemaRelationFields {
  /** Paths to relation keys (without specific fields) */
  keys: string[];

  /** Complete paths to fields that can be selected in relations */
  selectable: string[];

  /** Complete paths to fields that can be used for sorting in relations */
  sortable: string[];
}

/**
 * Comprehensive structure of paths in a schema
 * Used for validation and path resolution during query compilation
 */
export interface SchemaPaths {
  /** Relation fields information */
  relations: SchemaRelationFields;

  /** Root level fields information */
  root: SchemaRootFields;
}

export interface StructuredQuery {
  [key: string]: Record<string, boolean> | Record<string, StructuredQuery>;
}
