import {bigint, index, jsonb, pgTable, varchar} from 'drizzle-orm/pg-core';

export const easAttestations = pgTable(
  'eas_attestations',
  {
    uid: varchar('uid', {length: 100}).primaryKey(),
    attester: varchar('attester', {length: 100}).notNull(),
    recipient: varchar('recipient', {length: 100}).notNull(),
    schema: varchar('schema', {length: 100}).notNull(),
    decoded: jsonb('decoded').notNull(),
    chainId: varchar('chain_id', {length: 20}).notNull(),
    rawData: jsonb('raw_data').notNull(),
    createdAt: bigint('created_at', {mode: 'number'}).notNull(),
  },
  table => {
    return {
      schemaIndex: index('eas_schema_idx').on(table.schema),
      chainIndex: index('eas_chain_idx').on(table.chainId),
      attesterIndex: index('eas_attester_idx').on(table.attester),
      recipientIndex: index('eas_recipient_idx').on(table.recipient),
      decodedIndex: index('eas_decoded_idx').on(table.decoded),
      rawDataIndex: index('eas_rawdata_idx').on(table.rawData),
    };
  }
);
