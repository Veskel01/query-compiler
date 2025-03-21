# Structured Query Compiler

A TypeScript utility for generating structured database queries from a schema definition and field selections.

## Overview

The Structured Query Compiler allows you to define complex data schemas with relationships and generate optimized database queries. It handles nested relationships and field selections, ensuring that only the requested data is fetched from the database.

## Features

- Type-safe query building using TypeScript interfaces
- Support for deeply nested relationships
- Selective field inclusion for optimized queries
- Clean, empty-object-free query output
- Customizable query structure with configuration options
- **Flexible sorting options for both root and nested fields**

<!-- TODO - ADD installation instructions -->

## Usage

### 1. Define your data model interfaces

```typescript
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  posts: Post[];
  profile: UserProfile;
  // ...other fields
}

interface Post {
  id: number;
  title: string;
  content: string;
  author: User;
  // ...other fields
}

// ...other interfaces
```

### 2. Create a schema definition

```typescript
import { QuerySchemaDefinition } from 'structured-query-compiler';

const schema: QuerySchemaDefinition<User> = {
  selectableFields: ['id', 'firstName', 'lastName', 'email', 'username'],
  sortableFields: ['id', 'firstName', 'lastName', 'email'], // Define which fields can be sorted
  populate: {
    profile: {
      selectableFields: ['id', 'bio', 'avatarUrl'],
      sortableFields: ['id'], // Optional: specify sortable fields for relations
      populate: {
        socialLinks: {
          selectableFields: ['id', 'platform', 'url'],
          sortableFields: ['platform']
        }
      }
    },
    posts: {
      selectableFields: ['id', 'title', 'content'],
      sortableFields: ['id', 'title', 'createdAt']
      // ...define nested relations
    }
  }
};
```

### 3. Generate a query

```typescript
import { StructuredQueryCompiler } from 'structured-query-compiler';

const compiler = StructuredQueryCompiler.forSchema(schema);

// Define what to select and populate
const query = compiler.compile({
  selectableFields: ['id', 'firstName', 'lastName', 'email'],
  populate: [
    'profile',
    'profile.socialLinks',
    'posts',
    'posts.author.profile'
    // ...other relations to populate
  ],
  // Add sorting options
  sort: [
    { field: 'lastName', direction: 'asc' },
    { field: 'firstName', direction: 'asc' },
    { field: 'posts.createdAt', direction: 'desc' } // Nested sorting
  ]
});

// Use the generated query with your ORM/database
```

## Configuration Options

The compiler accepts several configuration options to customize the generated query:

```typescript
interface CompileInput {
  // Controls how to handle empty fields in the root object
  emptyRootFieldsBehavior?: EmptyRootFieldsBehavior;

  // Custom key to use for included relations (default: "include")
  includeKey?: string;

  // Array of relation paths to populate
  populate: string[];

  // Array of fields to select at the root level
  selectableFields: string[];

  // Custom key to use for selected fields (default: "select")
  selectKey?: string;

  // Sorting options (can be a single option or an array)
  sort?: SortOption | SortOption[];

  // Custom key to use for sorting (default: "orderBy")
  sortKey?: string;
}
```

### EmptyRootFieldsBehavior

This string literal type controls how the compiler handles scenarios when no root fields are explicitly selected:

- `'leaveEmpty'`: Keeps the empty selection object in the generated query
- `'returnAll'`: Automatically includes all fields defined as selectable in the schema

### Custom Keys

You can customize the property names used in the generated query:

```typescript
const query = compiler.compile({
  selectableFields: ['id', 'name'],
  populate: ['profile'],
  selectKey: 'fields', // Instead of "select"
  includeKey: 'relations', // Instead of "include"
  sort: { field: 'name', direction: 'asc' },
  sortKey: 'sort' // Instead of "orderBy"
});

// Generates:
// {
//   fields: { id: true, name: true },
//   relations: { profile: { fields: {...} } },
//   sort: { name: 'asc' }
// }
```

## Sorting

### Basic Sorting

```typescript
const query = compiler.compile({
  selectableFields: ['id', 'firstName', 'lastName'],
  populate: ['profile'],
  sort: { field: 'lastName', direction: 'asc' }
});

// Generates:
// {
//   select: { id: true, firstName: true, lastName: true },
//   include: { profile: { ... } },
//   orderBy: { lastName: 'asc' }
// }
```

### Multi-field Sorting

```typescript
const query = compiler.compile({
  selectableFields: ['id', 'firstName', 'lastName'],
  populate: ['posts'],
  sort: [
    { field: 'lastName', direction: 'asc' },
    { field: 'firstName', direction: 'asc' }
  ]
});
```

### Nested Sorting

You can sort by fields in nested relations using dot notation:

```typescript
const query = compiler.compile({
  selectableFields: ['id', 'firstName'],
  populate: ['posts', 'posts.comments'],
  sort: [
    { field: 'firstName', direction: 'asc' },
    { field: 'posts.createdAt', direction: 'desc' },
    { field: 'posts.comments.createdAt', direction: 'asc' }
  ]
});

// Generates nested sorting structure
```

The compiler will validate that the fields used for sorting are defined as sortable in the schema. If `sortableFields` is not specified, all fields from `selectableFields` will be considered sortable by default.

### Example Output

The compiler generates a structured query object like this:

```javascript
{
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true
  },
  include: {
    profile: {
      select: {
        id: true,
        bio: true,
        avatarUrl: true
      },
      include: {
        socialLinks: {
          select: {
            platform: true
          },
          orderBy: {
            platform: 'asc'
          }
        }
      }
    },
    posts: {
      select: {
        id: true,
        title: true,
        content: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        author: {
          include: {
            profile: {
              select: {
                id: true,
                bio: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    }
  },
  orderBy: {
    lastName: 'asc',
    firstName: 'asc'
  }
}
```

This query structure is compatible with ORMs like Prisma, and efficiently describes what data to fetch without empty objects.

## License

MIT
