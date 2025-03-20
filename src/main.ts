import { StructuredQueryCompiler } from './core/compiler';
import type { QuerySchemaDefinition } from './interfaces';

interface User {
  comments: Comment[];
  createdAt: Date;
  dateOfBirth: Date;
  email: string;
  firstName: string;
  followers: User[];
  following: User[];
  id: number;
  isActive: boolean;
  lastName: string;
  posts: Post[];
  profile: UserProfile;
  role: Role;
  updatedAt: Date;
  username: string;
}

interface UserProfile {
  avatarUrl: string;
  bio: string;
  id: number;
  location: string;
  socialLinks: SocialLink[];
  websiteUrl: string;
}

interface SocialLink {
  id: number;
  platform: string;
  url: string;
}

interface Post {
  attachments: Attachment[];
  author: User;
  categories: Category[];
  comments: Comment[];
  content: string;
  excerpt: string;
  id: number;
  isPublished: boolean;
  likes: Like[];
  publishedAt: Date;
  slug: string;
  tags: Tag[];
  title: string;
  viewCount: number;
}

interface Comment {
  author: User;
  childComments: Comment[];
  content: string;
  createdAt: Date;
  id: number;
  likes: Like[];
  parentComment?: Comment;
  post: Post;
  updatedAt: Date;
}

interface Category {
  childCategories: Category[];
  description: string;
  id: number;
  name: string;
  parentCategory?: Category;
  posts: Post[];
  slug: string;
}

interface Tag {
  id: number;
  name: string;
  posts: Post[];
  slug: string;
}

interface Attachment {
  fileName: string;
  fileSize: number;
  fileType: string;
  id: number;
  post: Post;
  url: string;
}

interface Like {
  comment?: Comment;
  createdAt: Date;
  id: number;
  post?: Post;
  user: User;
}

interface Role {
  description: string;
  id: number;
  name: string;
  permissions: Permission[];
  users: User[];
}

interface Permission {
  description: string;
  id: number;
  name: string;
  roles: Role[];
}

const schema: QuerySchemaDefinition<User> = {
  selectableFields: ['id', 'firstName', 'lastName', 'email', 'username', 'createdAt', 'updatedAt'],
  populate: {
    profile: {
      selectableFields: ['id', 'bio', 'avatarUrl', 'location'],
      populate: {
        socialLinks: {
          selectableFields: ['id', 'platform', 'url']
        }
      }
    },
    posts: {
      selectableFields: ['id', 'title', 'content', 'publishedAt'],
      populate: {
        author: {
          selectableFields: ['id', 'username', 'email'],
          populate: {
            profile: {
              selectableFields: ['id', 'bio', 'avatarUrl']
            }
          }
        },
        comments: {
          selectableFields: ['id', 'content', 'createdAt'],
          populate: {
            likes: {
              selectableFields: ['id', 'createdAt'],
              populate: {
                user: {
                  selectableFields: ['id', 'username'],
                  populate: {
                    profile: {
                      selectableFields: ['id', 'bio', 'avatarUrl']
                    }
                  }
                }
              }
            },
            author: {
              selectableFields: ['id', 'username', 'email']
            },
            childComments: {
              selectableFields: ['id', 'content', 'createdAt'],
              populate: {
                author: {
                  selectableFields: ['id', 'username']
                }
              }
            }
          }
        },
        categories: {
          selectableFields: ['id', 'name', 'slug'],
          populate: {
            parentCategory: {
              selectableFields: ['id', 'name', 'slug']
            }
          }
        },
        tags: {
          selectableFields: ['id', 'name', 'slug']
        },
        attachments: {
          selectableFields: ['id', 'fileName', 'fileSize', 'fileType', 'url']
        }
      }
    },
    role: {
      selectableFields: ['id', 'name', 'description'],
      populate: {
        permissions: {
          selectableFields: ['id', 'name', 'description']
        }
      }
    }
  }
};

const selectableFields = ['id', 'firstName', 'lastName', 'email', 'createdAt', 'updatedAt'];
const populate = [
  'profile',
  'profile.avatarUrl',
  'profile.socialLinks',
  'profile.socialLinks.platform',
  'profile.socialLinks.url',

  'posts',
  'posts.author.profile',
  'posts.comments',
  'posts.comments.id',
  'posts.comments.author',
  'posts.comments.childComments',
  'posts.comments.childComments.content',
  'posts.comments.childComments.author',

  'posts.comments.likes',
  'posts.comments.likes.user',
  'posts.comments.likes.user.profile',

  'posts.categories',
  'posts.categories.parentCategory',

  'posts.tags.id',
  'posts.tags.name',
  'posts.attachments.fileName',
  'posts.attachments.fileSize',

  'role',
  'role.name',
  'role.permissions'
];

const compiler = StructuredQueryCompiler.forSchema(schema);

const query = compiler.compile({
  populate,
  selectableFields
});

// TODO - complete
