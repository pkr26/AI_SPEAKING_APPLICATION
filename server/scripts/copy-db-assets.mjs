import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist/db/migrations', { recursive: true });
cpSync('db/migrations', 'dist/db/migrations', { recursive: true, force: true });
cpSync('db/seed.sql', 'dist/db/seed.sql', { force: true });
