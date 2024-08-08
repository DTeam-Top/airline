import {EAS, SchemaRegistry} from '@ethereum-attestation-service/eas-sdk';
import dotenv from 'dotenv';
import {InfuraProvider, Wallet} from 'ethers';

dotenv.config();

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const ATTESTOR_PK = process.env.TEST_WALLET70_SK || '';
const wallet = new Wallet(ATTESTOR_PK, new InfuraProvider(11155111));

const schemaRegistryContractAddress =
  '0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0';
const schemaRegistry = new SchemaRegistry(schemaRegistryContractAddress);
schemaRegistry.connect(wallet);

const easContractAddress = '0xC2679fBD37d54388Ce493F1DB75320D236e1815e';
const eas = new EAS(easContractAddress);
eas.connect(wallet);

async function createSchema(schema: string) {
  const resolverAddress = '0x0a7E2Ff54e76B8E6659aedc9103FB21c038050D0'; // Sepolia 0.26
  const revocable = true;

  const transaction = await schemaRegistry.register({
    schema,
    resolverAddress,
    revocable,
  });

  await transaction.wait();
}

async function getSchema(uid: string) {
  const schema = await schemaRegistry.getSchema({uid});
  console.log(schema);
}

const wrapperAttestation =
  'address attester, address recipient, string format, string scriptURI';

createSchema(wrapperAttestation);
