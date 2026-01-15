import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Provide a dummy URL during Docker build if DATABASE_URL is not set
// The actual URL will be used at runtime for migrations
const databaseUrl =
  process.env.DATABASE_URL ||
  'postgresql://user:password@localhost:5432/placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
