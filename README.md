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
  populate: {
    profile: {
      selectableFields: ['id', 'bio', 'avatarUrl'],
      populate: {
        socialLinks: {
          selectableFields: ['id', 'platform', 'url']
        }
      }
    },
    posts: {
      selectableFields: ['id', 'title', 'content']
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
  includeKey: 'relations' // Instead of "include"
});

// Generates:
// {
//   fields: { id: true, name: true },
//   relations: { profile: { fields: {...} } }
// }
```

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
  }
}
```

This query structure is compatible with ORMs like Prisma, and efficiently describes what data to fetch without empty objects.

## License

MIT
