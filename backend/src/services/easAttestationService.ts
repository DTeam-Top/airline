import {
  SchemaDecodedItem,
  SchemaEncoder,
  SchemaItem,
} from '@ethereum-attestation-service/eas-sdk';
import {and, eq, gte, sql} from 'drizzle-orm';
import {ethers, verifyTypedData} from 'ethers';
import {DbService} from '../_core/services/dbService';
import {
  SCHEMAS,
  WRAPPER_ATTESTATION,
  contracts,
  emailTypes,
  offchain,
  schemaRegistry,
  serverWallet,
  types,
} from '../constant';
import {easAttestations} from '../domain/schemas/easAttestations';
import {env} from '../env';

const selectFields = {
  uid: easAttestations.uid,
  attester: easAttestations.attester,
  subject: easAttestations.recipient,
  schema: easAttestations.schema,
  decoded: easAttestations.decoded,
  createdAt: easAttestations.createdAt,
  rawData: easAttestations.rawData,
};

type rawData = {
  message: {revocable: boolean; expirationTime: number};
  domain: {chainId: number};
};

export async function getEasAttestationRawDataByAttester(
  dbService: DbService,
  attester: string,
  uid: string,
  chain: string
) {
  const result = await dbService
    .db()
    .select({rawData: easAttestations.rawData})
    .from(easAttestations)
    .where(
      and(
        eq(easAttestations.attester, attester),
        eq(easAttestations.uid, uid),
        sql`(raw_data->>'domain')::json->>'chainId' = ${chain}`
      )
    )
    .limit(1);

  return result.length ? result[0] : undefined;
}

export async function getEasAttestationByAttester(
  dbService: DbService,
  attester: string,
  uid: string
) {
  const result = await dbService
    .db()
    .select(selectFields)
    .from(easAttestations)
    .where(
      and(eq(easAttestations.attester, attester), eq(easAttestations.uid, uid))
    )
    .limit(1);
  return result.length
    ? {
        uid: result[0].uid,
        attester: result[0].attester,
        subject: result[0].subject,
        schema: result[0].schema,
        decoded: result[0].decoded,
        createdAt: result[0].createdAt,
        rawData: {
          message: {
            revocable: (result[0].rawData as rawData).message.revocable,
            expirationTime: (result[0].rawData as rawData).message
              .expirationTime,
          },
          domain: {
            chainId: (result[0].rawData as rawData).domain.chainId,
          },
        },
      }
    : undefined;
}

export async function getEasAttestationBySubject(
  dbService: DbService,
  subject: string,
  uid: string
) {
  const result = await dbService
    .db()
    .select(selectFields)
    .from(easAttestations)
    .where(
      and(eq(easAttestations.recipient, subject), eq(easAttestations.uid, uid))
    )
    .limit(1);

  return result.length ? result[0] : undefined;
}

export async function ownerOf(
  dbService: DbService,
  attester: string,
  uid: string
) {
  const result = await getEasAttestationByAttester(dbService, attester, uid);

  return result ? result.subject : ethers.ZeroAddress;
}

export async function isAttesterExist(dbService: DbService, attester: string) {
  const result = await dbService
    .db()
    .select({attester: easAttestations.attester})
    .from(easAttestations)
    .where(eq(easAttestations.attester, attester))
    .limit(1);

  return !!result.length;
}

export async function listAttestationsBySubject(
  dbService: DbService,
  subject: string,
  startAt: number = 0,
  max: number
) {
  return await dbService
    .db()
    .select(selectFields)
    .from(easAttestations)
    .where(
      and(
        eq(easAttestations.recipient, subject),
        gte(easAttestations.createdAt, startAt)
      )
    )
    .orderBy(easAttestations.createdAt, easAttestations.uid)
    .limit(max);
}

export async function getCountBySubject(dbService: DbService, subject: string) {
  const result = await dbService
    .db()
    .select({count: sql<number>`count(*)`})
    .from(easAttestations)
    .where(eq(easAttestations.recipient, subject));

  return result.length ? Number(result[0].count) : 0;
}

export async function listAttestationsByAttester(
  dbService: DbService,
  attester: string,
  startAt: number = 0,
  max: number
) {
  const result = await dbService
    .db()
    .select(selectFields)
    .from(easAttestations)
    .where(
      and(
        eq(easAttestations.attester, attester),
        gte(easAttestations.createdAt, startAt)
      )
    )
    .orderBy(easAttestations.createdAt)
    .limit(max);
  return result;
}

export async function listAttestationsByAttesterAndSubject(
  dbService: DbService,
  attester: string,
  subject: string,
  startAt: number = 0,
  max: number
) {
  return await dbService
    .db()
    .select(selectFields)
    .from(easAttestations)
    .where(
      and(
        eq(easAttestations.attester, attester),
        eq(easAttestations.recipient, subject),
        gte(easAttestations.createdAt, startAt)
      )
    )
    .orderBy(easAttestations.createdAt)
    .limit(max);
}

export async function balanceOf(
  dbService: DbService,
  attester: string,
  subject: string
) {
  const result = await dbService
    .db()
    .select({count: sql<number>`COUNT(*)`})
    .from(easAttestations)
    .where(
      and(
        eq(easAttestations.attester, attester),
        eq(easAttestations.recipient, subject)
      )
    );

  return result[0].count;
}

export async function totalSupply(dbService: DbService, attester: string) {
  const result = await dbService
    .db()
    .select({count: sql<number>`COUNT(*)`})
    .from(easAttestations)
    .where(eq(easAttestations.attester, attester));

  return result[0].count;
}

export async function tokenByIndex(
  dbService: DbService,
  attester: string,
  index: number
) {
  const total = await totalSupply(dbService, attester);
  if (index >= total) {
    throw new Error('index out of range');
  }

  // TODO: improve later, because if index is very big, the method not valid.
  // a better way asks to index when saving.
  const rows = await dbService
    .db()
    .select({uid: easAttestations.uid})
    .from(easAttestations)
    .where(eq(easAttestations.attester, attester))
    .limit(index + 1);

  return rows[index].uid;
}

export async function tokenOfOwnerByIndex(
  dbService: DbService,
  attester: string,
  subject: string,
  index: number
) {
  const balance = await balanceOf(dbService, attester, subject);
  if (index >= balance) {
    throw new Error('index out of range');
  }

  // TODO: improve later, because if index is very big, the method not valid.
  // a better way asks to index when saving.
  const rows = await dbService
    .db()
    .select({uid: easAttestations.uid})
    .from(easAttestations)
    .where(
      and(
        eq(easAttestations.attester, attester),
        eq(easAttestations.recipient, subject)
      )
    )
    .limit(index + 1);

  return rows[index].uid;
}

export async function saveAttestation(
  dbService: DbService,
  offchainAttestation: any
) {
  const attester = getAttester(offchainAttestation);
  const recipient = offchainAttestation.message.recipient;
  const schema = offchainAttestation.message.schema;
  const decoded = decodeData(
    await getSchemaSignature(schema),
    offchainAttestation.message.data
  );

  const easAttestation = {
    uid: offchainAttestation.uid,
    attester,
    recipient,
    schema,
    decoded: decoded.formatted,
    chainId: env.CHAIN_ID.toString(),
    rawData: offchainAttestation,
    createdAt: Number(offchainAttestation.message.time),
  };

  await dbService.db().insert(easAttestations).values(easAttestation);
  return {...easAttestation};
}

export function isSubject(subject: string, offchainAttestation: any) {
  return subject === offchainAttestation.message.recipient;
}

export function isAttester(attester: string, offchainAttestation: any) {
  return offchain.verifyOffchainAttestationSignature(
    attester,
    offchainAttestation
  );
}

export function getAttester(offchainAttestation: any) {
  return verifyTypedData(
    offchainAttestation.domain,
    offchainAttestation.types,
    offchainAttestation.message,
    offchainAttestation.signature
  );
}

export function decodeData(schema: string, data: string) {
  const schemaEncoder = new SchemaEncoder(schema);
  const decoded = schemaEncoder.decodeData(data);
  // Assumption: one layer only, no embedded schema
  const formatted: {[key: string]: any} = {};
  const itemSchema: {[key: string]: SchemaDecodedItem} = {};
  decoded.forEach(item => {
    formatted[item.name] = item.value.value;
    itemSchema[item.name] = item;
  });
  return {formatted, raw: itemSchema};
}

function encodeData(schema: string, data: SchemaItem[]) {
  const schemaEncoder = new SchemaEncoder(schema);
  const encoded = schemaEncoder.encodeData(data);
  return encoded;
}

async function getSchemaSignature(uid: string) {
  const schema = await schemaRegistry.getSchema({uid});
  return schema.schema;
}

export function normalize(offchainAttestation: any) {
  return offchainAttestation.sig || offchainAttestation;
}

export async function createAttestation(
  schemaSignature: string,
  schema: string,
  data: SchemaItem[],
  recipient: string,
  expirationTime: bigint = 0n,
  isLongTime: boolean = true
) {
  const schemaEncoder = new SchemaEncoder(schemaSignature);
  const encodedData = schemaEncoder.encodeData(data);
  const offchainAttestation = await offchain.signOffchainAttestation(
    {
      recipient,
      expirationTime,
      time: isLongTime
        ? BigInt(new Date().getTime())
        : BigInt(Math.round(new Date().getTime() / 1000)),
      revocable: true,
      version: 1,
      nonce: 0n,
      schema,
      refUID:
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      data: encodedData,
    },
    serverWallet
  );

  return offchainAttestation;
}

export async function getEasAttestationByDecoded(
  dbService: DbService,
  schema: string,
  token: string,
  id: string
) {
  const result = await dbService
    .db()
    .select(selectFields)
    .from(easAttestations)
    .where(
      and(
        eq(easAttestations.schema, schema),
        sql`lower(decoded->>'token') = lower(${token})`,
        id ? sql`decoded->>'id' = ${id}` : sql`decoded->>'id' is null`
      )
    )
    .limit(1);

  return result.length ? result[0] : undefined;
}

function slnDomain() {
  return {
    name: 'EAS Attestation',
    chainId: env.TARGET_CHAIN_ID,
    version: '1.2.0',
  };
}

export function verifyIdSignature(
  id: {
    idType: string;
    value: string;
    secret?: string;
  },
  signature: string
) {
  return verifyTypedData(slnDomain(), getTypes(id), id, signature);
}

function getTypes(id: {idType: string; value: string; secret?: string}) {
  return id.idType === 'email' ? emailTypes : types;
}

export async function getIssuerByRecipient(
  dbService: DbService,
  recipient: string
) {
  const result = await dbService
    .db()
    .execute(
      sql`select distinct ${sql.raw(
        'attester'
      )}  from eas_attestations where ${sql.raw('recipient')} = ${recipient};`
    );

  return result.rows;
}

export async function createIdAttestation(
  idType: string,
  id: string,
  subject: string,
  scriptURI: string,
  expireTime: number = 1 //hour
) {
  const idAttestation = await createAttestation(
    SCHEMAS!.id[0],
    SCHEMAS!.id[1],
    [
      {name: 'idType', value: idType, type: 'string'},
      {name: 'id', value: id, type: 'string'},
      {name: 'subject', value: subject, type: 'address'},
      {name: 'scriptURI', value: scriptURI, type: 'string'},
    ],
    subject,
    expireTime === 0
      ? BigInt(expireTime)
      : BigInt(
          Math.round(
            (new Date().getTime() + 1000 * 60 * 60 * expireTime) / 1000
          )
        ),
    false
  );

  return idAttestation;
}

export async function getIdAttestationsByType(
  dbService: DbService,
  type: string,
  startAt: number = 0,
  max: number
) {
  let idAttestations: any[] = [];
  const rows = await dbService
    .db()
    .select(selectFields)
    .from(easAttestations)
    .where(
      and(
        eq(easAttestations.schema, SCHEMAS!.id[1]),
        sql`decoded->>'idType' = ${type}`,
        gte(easAttestations.createdAt, startAt)
      )
    )
    .orderBy(easAttestations.createdAt)
    .limit(max);
  rows.forEach((item: any) => {
    idAttestations.push({
      uid: item.uid,
      attester: item.attester,
      email: item.decoded.id,
      createdAt: item.createdAt,
      expirationTime: item.rawData.message.expirationTime,
      revocable: item.rawData.message.revocable,
      idType: type,
    });
  });

  return idAttestations;
}

export async function getIdStatus(dbService: DbService) {
  const result = await dbService
    .db()
    .execute(
      sql`select distinct(decoded->>'idType') as type,count(uid)  from eas_attestations where decoded->>'idType' is not null and ${sql.raw(
        'schema'
      )} = ${SCHEMAS!.id[1]} group by decoded->>'idType';`
    );
  let status = {email: 0, discord: 0, twitter: 0, github: 0};
  result.rows.forEach((item: any) => {
    (status as any)[item.type] = item.count;
  });
  return status;
}
