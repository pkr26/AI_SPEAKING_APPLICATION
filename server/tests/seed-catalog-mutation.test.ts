import fs from 'fs';
import path from 'path';
import { expect, it } from 'vitest';

import { renderSeedSql } from '../db/generate-seed';

it('renders the complete authored catalog byte-for-byte as the reviewed deployment artifact', () => {
  const committedSql = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8');
  expect(renderSeedSql()).toBe(committedSql);
});
