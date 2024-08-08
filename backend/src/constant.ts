import {DynamoDBClientConfigType} from '@aws-sdk/client-dynamodb';
import {EAS, SchemaRegistry} from '@ethereum-attestation-service/eas-sdk';
import {SessionStore} from '@fastify/session';
import {InfuraProvider, Wallet} from 'ethers';
import {z} from 'zod';
import DynamoDBSessionStore from './_core/services/dynamoDBSessionStore';
import FileSessionStore from './_core/services/fileSessionStore';
import {env} from './env';

export const MAX_LIMIT = 50;
export const BULK_LIMIT = 100;

export const errorResponseSchema = z.object({
  error: z.string(),
});

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

export const serverProvider = new InfuraProvider(
  env.TARGET_CHAIN_ID,
  env.INFURA_PROJECT_ID
);
export const serverWallet = new Wallet(env.SLN_ATTESTER_SK, serverProvider);

export const contracts = {
  1: {
    schemaRegistry: '0xA7b39296258348C78294F95B872b282326A97BDF',
    eas: '0xA1207F3BBa224E2c9c3c6D5aF63D0eb1582Ce587',
    wrapperAttestation: '', //todo
  },
  11155111: {
    schemaRegistry: '0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0',
    eas: '0xC2679fBD37d54388Ce493F1DB75320D236e1815e',
    wrapperAttestation:
      '0x26307623e2d6c6a171576cc93cf41a0fa42863961aa8ebe552e48b06681cc078',
  },
  137: {
    schemaRegistry: '0x7876EEF51A891E737AF8ba5A5E0f0Fd29073D5a7',
    eas: '0x5E634ef5355f45A855d02D66eCD687b1502AF790',
    wrapperAttestation:
      '0x779e5c99cd12e12827cb2a9b15319cdbab804a042afec43d95682191e5aeaa7f',
  },
}[env.TARGET_CHAIN_ID];

export const WRAPPER_ATTESTATION =
  'address attester, address recipient, string format, string scriptURI';

if (!contracts) {
  throw new Error(`No EAS contracts found for chain ${env.TARGET_CHAIN_ID}`);
}

export const schemaRegistry = new SchemaRegistry(contracts.schemaRegistry);
schemaRegistry.connect(serverProvider);

export const eas = new EAS(contracts.eas);
eas.connect(serverProvider);

export const easVersion = await eas.getVersion();

export const offchain = await eas.getOffchain();

export const sessionStore = await (():
  | Promise<SessionStore>
  | SessionStore
  | undefined => {
  switch (env.SESSION_STORE) {
    case 'memory':
      return undefined;
    case 'dynamodb': {
      const args: DynamoDBClientConfigType = {
        region: env.DYNAMODB_REGION,
        endpoint: env.DYNAMODB_ENDPOINT,
      };
      if (env.DYNAMODB_ACCESS_KEY_ID && env.DYNAMODB_SECRET_ACCESS_KEY) {
        args.credentials = {
          accessKeyId: env.DYNAMODB_ACCESS_KEY_ID,
          secretAccessKey: env.DYNAMODB_SECRET_ACCESS_KEY,
        };
      }
      return DynamoDBSessionStore.create(args);
    }
    case 'file':
      return new FileSessionStore();
    default:
      throw new Error(`Unknown session store: ${env.SESSION_STORE}`);
  }
})();

export const REDIRECCT_LIST = ['https://smartlayer.network/sln-attestations'];
export const OTP_EMAIL_TEMPLATE_URL =
  'https://resources.smartlayer.network/emails/v1/sln_otp.template.html';

export const SCHEMAS = {
  137: {
    id: [
      'string idType, string id, address subject, string scriptURI',
      '0x79b84a21253707c939a9dde579dcc048c208a46170b184a8240cb205075ed01c',
    ],
  },
  11155111: {
    id: [
      'string idType, string id, address subject, string scriptURI',
      '0x9775cfbff5ebe8ec1e54b36028b3c00e02603eaa3c2178cc0eb445f7a9c163d8', // Sepolia
    ],
  },
}[env.TARGET_CHAIN_ID];

export const SUPPORT_TYPES = ['email', 'discord', 'twitter', 'github'];

export const emailTypes = {
  idData: [
    {name: 'idType', type: 'string'},
    {name: 'value', type: 'string'},
    {name: 'secret', type: 'string'},
  ],
};

export const types = {
  idData: [
    {name: 'idType', type: 'string'},
    {name: 'value', type: 'string'},
  ],
};

export const oauthConfig: {
  [key: string]: {
    authorizationURL: string;
    tokenURL: string;
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
    pkce?: boolean;
    state?: boolean;
    sessionKey?: string;
    customHeaders?: {};
  };
} = {
  github: {
    authorizationURL: 'https://github.com/login/oauth/authorize',
    tokenURL: 'https://github.com/login/oauth/access_token',
    clientID: env.GITHUB_CLIENT_ID || 'f792eaf8dbe5bcce975c',
    clientSecret:
      env.GITHUB_CLIENT_SECRET || '569203c6000b906a76fc23d952e529f3f24acf07',
    callbackURL: `${env.CALLBACK_URL_ROOT}/auth/github/callback`,
    scope: ['user:email'],
  },
  discord: {
    authorizationURL: 'https://discord.com/api/oauth2/authorize',
    tokenURL: 'https://discord.com/api/oauth2/token',
    clientID: env.DISCORD_CLIENT_ID || '1145649279306829865',
    clientSecret:
      env.DISCORD_CLIENT_SECRET || 'B_YE6ZeTaeVZBer-i50rU71cj0Lh5vql',
    callbackURL: `${env.CALLBACK_URL_ROOT}/auth/discord/callback`,
    scope: ['identify', 'email'],
  },
  twitter: {
    authorizationURL: 'https://twitter.com/i/oauth2/authorize',
    tokenURL: 'https://api.twitter.com/2/oauth2/token',
    clientID: env.TWITTER_CLIENT_ID || 'M2tadlI1b3NkLW5Wa1AwYm1INDY6MTpjaQ',
    clientSecret:
      env.TWITTER_CLIENT_SECRET ||
      'kch74rcEidgNeGpvMrpToVC6Xyr-9TMIyUgXqcA9_azpJj7RhA',
    callbackURL: `${env.CALLBACK_URL_ROOT}/auth/twitter/callback`,
    scope: ['tweet.read', 'users.read'],
    pkce: true,
    state: true,
    sessionKey: 'oauth2:twitter',
    customHeaders: {
      Authorization:
        'Basic ' +
        Buffer.from(
          `${env.TWITTER_CLIENT_ID || 'M2tadlI1b3NkLW5Wa1AwYm1INDY6MTpjaQ'}:${
            env.TWITTER_CLIENT_SECRET ||
            'kch74rcEidgNeGpvMrpToVC6Xyr-9TMIyUgXqcA9_azpJj7RhA'
          }`
        ).toString('base64'),
    },
  },
};

export const verifyURL: {
  [key: string]: string;
} = {
  github: 'https://api.github.com/user',
  discord: 'https://discord.com/api/users/@me',
  twitter: 'https://api.twitter.com/2/users/me',
};
