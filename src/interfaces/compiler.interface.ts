import type { SortDirection } from '../constants';

export type EmptyRootFieldsBehavior = 'leaveEmpty' | 'returnAll';

export interface SortOption {
  direction?: keyof typeof SortDirection | SortDirection;
  field: string;
}

export interface SortQueryPart {
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
