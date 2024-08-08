import {
  DeleteItemCommandInput,
  DynamoDB,
  DynamoDBClientConfigType,
  GetItemCommandInput,
  PutItemCommandInput,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import {SessionStore} from '@fastify/session';
import {env} from '../../env';
import {LOGGER} from '../constant';

export default class DynamoDBSessionStore implements SessionStore {
  private static readonly TABLE_NAME = env.DYNAMODB_SESSION_STORE_TABLE;
  private static readonly DEFAULT_TTL = env.SESSION_TTL_IN_SECONDS;
  private readonly logger = LOGGER.child({from: 'DynamoDBSessionStore'});
  private readonly dynamoDb: DynamoDB;

  private constructor(options: DynamoDBClientConfigType = {}) {
    this.dynamoDb = new DynamoDB(options);
  }

  private async setTTL() {
    return this.dynamoDb.updateTimeToLive({
      TableName: DynamoDBSessionStore.TABLE_NAME,
      TimeToLiveSpecification: {Enabled: true, AttributeName: 'ttl'},
    });
  }

  private async init() {
    try {
      await this.dynamoDb.describeTable({
        TableName: DynamoDBSessionStore.TABLE_NAME,
      });
    } catch (err: any) {
      // table does not exists. Create it
      if (err.name === 'ResourceNotFoundException') {
        this.logger.info(
          'Creating DynamoDB table: %s',
          DynamoDBSessionStore.TABLE_NAME
        );
        await this.dynamoDb.createTable({
          TableName: DynamoDBSessionStore.TABLE_NAME,
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S',
            },
          ],
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH',
            },
          ],
          BillingMode: 'PAY_PER_REQUEST',
        });
        const results = await waitUntilTableExists(
          {client: this.dynamoDb, maxWaitTime: 120},
          {TableName: DynamoDBSessionStore.TABLE_NAME}
        );
        if (results.state !== 'SUCCESS') {
          throw new Error(results.reason);
        }
      } else {
        this.logger.error('create dynamodb table failed: ', err);
        throw err;
      }
    }
    const ttlResult = await this.dynamoDb.describeTimeToLive({
      TableName: DynamoDBSessionStore.TABLE_NAME,
    });
    if (ttlResult.TimeToLiveDescription?.TimeToLiveStatus !== 'ENABLED') {
      this.logger.info(
        'set ttl to dynamodb table: %s',
        DynamoDBSessionStore.TABLE_NAME
      );
      await this.setTTL();
    }
  }

  static async create(
    options: DynamoDBClientConfigType = {}
  ): Promise<DynamoDBSessionStore> {
    const store = new DynamoDBSessionStore(options);
    await store.init();

    return store;
  }

  set(sessionId: string, session: any, callback: any) {
    const ts = Math.floor(Date.now() / 1000);
    const args: PutItemCommandInput = {
      TableName: DynamoDBSessionStore.TABLE_NAME,
      Item: {
        session: {S: JSON.stringify(session)},
        id: {S: sessionId},
        ttl: {N: `${ts + DynamoDBSessionStore.DEFAULT_TTL}`},
      },
    };
    this.dynamoDb.putItem(args).then(() => {
      this.logger.debug('Session id %s saved: %o', sessionId, session);
      callback();
    });
  }

  get(sessionId: string, callback: any) {
    const args: GetItemCommandInput = {
      TableName: DynamoDBSessionStore.TABLE_NAME,
      Key: {
        id: {S: sessionId},
      },
    };

    this.dynamoDb.getItem(args).then(result => {
      if (result.Item?.session?.S) {
        const session = JSON.parse(result.Item.session.S);
        this.logger.debug('Session id %s loaded: %o', sessionId, session);
        callback(null, session);
      } else {
        callback(null, null);
      }
    });
  }

  destroy(sessionId: string, callback: any) {
    const args: DeleteItemCommandInput = {
      TableName: DynamoDBSessionStore.TABLE_NAME,
      Key: {
        id: {S: sessionId},
      },
    };
    this.dynamoDb.deleteItem(args).then(() => callback());
  }
}
