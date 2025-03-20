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

export type QuerySchemaDefinition<T, TDepth extends number = 5> = {
  selectableFields?: Array<PrimitiveKeys<T>>;
} & (HasObjectProperties<T> extends true
  ? TDepth extends 0
    ? {} // Stop recursion when depth is 0
    : {
        populate?: {
          [K in ObjectKeys<T>]?: NonNullable<T[K]> extends Array<infer U>
            ? QuerySchemaDefinition<NonNullable<U>, Decremented[TDepth]>
            : NonNullable<T[K]> extends object
              ? QuerySchemaDefinition<NonNullable<T[K]>, Decremented[TDepth]>
              : never;
        };
      }
  : {});

export interface SchemaPaths {
  relationFields: string[];
  relationKeys: string[];
  rootFields: string[];
}

export interface StructuredQuery {
  [key: string]: Record<string, boolean> | Record<string, StructuredQuery>;
}
