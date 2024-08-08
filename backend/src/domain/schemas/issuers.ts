import {bigint, index, pgTable, varchar} from 'drizzle-orm/pg-core';

export const issuers = pgTable(
  'issuers',
  {
    address: varchar('address', {length: 100}).primaryKey(),
    name: varchar('name', {length: 50}).notNull(),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
  },
  table => {
    return {
      addressIndex: index('issuers_address_idx').on(table.address),
    };
  }
);
