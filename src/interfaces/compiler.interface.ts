import type { SortDirection } from '../constants';

export type EmptyRootFieldsBehavior = 'leaveEmpty' | 'returnAll';

/**
 * Sort option for any field (root or nested)
 */
export interface SortOption {
  /** The direction to sort in (defaults to 'asc') */
  direction?: keyof typeof SortDirection | SortDirection;

  /**
   * The field to sort by
   * Can be a root field (e.g. "lastName") or a nested field path (e.g. "posts.comments.createdAt")
   */
  field: string;
}

/**
 * Part of the query that contains sort options
 */
export interface SortQueryPart {
  /** The sort key (e.g., "orderBy") with its value */
  [sortKey: string]: Record<string, SortDirection>;
}

export interface CompileOptions {
  emptyRootFieldsBehavior?: EmptyRootFieldsBehavior;
  includeKey?: string;
  populate: string[];
  selectableFields: string[];
  selectKey?: string;
  sort?: SortOption | SortOption[];
  sortKey?: string;
}
