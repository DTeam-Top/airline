import {eq} from 'drizzle-orm';
import {issuers} from '../domain/schemas/issuers';
import {DbService} from '../_core/services/dbService';

export async function getIssuer(dbService: DbService, address: string) {
  const result = await dbService
    .db()
    .select({name: issuers.name, address: issuers.address})
    .from(issuers)
    .where(eq(issuers.address, address))
    .limit(1);

  return result.length ? result[0] : undefined;
}
