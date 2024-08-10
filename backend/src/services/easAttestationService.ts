import {
  SchemaEncoder,
  SchemaItem,
} from "@ethereum-attestation-service/eas-sdk";
import { encodeValue } from "@latticexyz/protocol-parser/internal";
import { ethers, verifyTypedData } from "ethers";
import { SellingOfferRequest } from "../actions/requestSchemas";
import {
  MUD_SALE_SHCEMA,
  SCHEMAS,
  eas,
  emailTypes,
  serverWallet,
  types,
} from "../constant";
import { env } from "../env";
import { uploadEASAttestation } from "./externalApi";
import { rawDataSchemas } from "./utils";

export async function createAndUploadSellingOffserAttestation(
  request: SellingOfferRequest,
  seller: string,
  scriptURI: string
) {
  const signature = ethers.Signature.from(request.signature);
  const rawData = encodeValue(rawDataSchemas.saleOffer, {
    token: request.offer.token,
    tokenId: request.offer.id,
    erc20: request.offer.erc20,
    amount: request.offer.price,
    signatureV: signature.v,
    signatureR: signature.r,
    signatureS: signature.s,
    provider: request.offer.receiverIdType,
    id: request.offer.receiver,
  });
  const schecma = [
    {
      name: "schemaId",
      value: MUD_SALE_SHCEMA,
      type: "bytes32",
    },
    {
      name: "rawData",
      value: rawData,
      type: "bytes",
    },
    { name: "scriptURI", value: scriptURI, type: "string" },
  ];

  const sellingOffer = await createMudAttestation(
    SCHEMAS!.offerForSellingMud[0],
    SCHEMAS!.offerForSellingMud[1],
    schecma,
    serverWallet.address
  );

  const attestation = { sig: sellingOffer, signer: seller };
  return await uploadEASAttestation(
    "attester",
    await serverWallet.signMessage(JSON.stringify(attestation, replacer)),
    JSON.stringify(attestation, replacer)
  );
}

const replacer = (key: string, value: any) =>
  typeof value === "bigint" ? value.toString() : value;

export async function createIdAttestation(
  idType: string,
  id: string,
  subject: string
) {
  const scriptURI = "";
  const idAttestation = await createAttestation(
    SCHEMAS!.id[0],
    SCHEMAS!.id[1],
    [
      { name: "idType", value: idType, type: "string" },
      { name: "id", value: id, type: "string" },
      { name: "subject", value: subject, type: "address" },
      { name: "scriptURI", value: scriptURI, type: "string" },
    ],
    subject,
    BigInt(Math.round((new Date().getTime() + 1000 * 60 * 60) / 1000))
  );

  return idAttestation;
}

async function createMudAttestation(
  schemaSignature: string,
  schema: string,
  data: SchemaItem[],
  recipient: string,
  expirationTime: bigint = 0n
) {
  const offchain = await eas.getOffchain();
  const schemaEncoder = new SchemaEncoder(schemaSignature);
  const encodedData = schemaEncoder.encodeData(data);
  const offchainAttestation = await offchain.signOffchainAttestation(
    {
      recipient,
      expirationTime: 0n,
      time: BigInt(Math.round(new Date().getTime() / 1000)),
      revocable: true,
      version: 1,
      nonce: 0n,
      schema,
      refUID:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      data: encodedData,
    },
    serverWallet
  );

  return offchainAttestation;
}

async function createAttestation(
  schemaSignature: string,
  schema: string,
  data: SchemaItem[],
  recipient: string,
  expirationTime: bigint = 0n
) {
  const offchain = await eas.getOffchain();
  const schemaEncoder = new SchemaEncoder(schemaSignature);
  const encodedData = schemaEncoder.encodeData(data);
  const offchainAttestation = await offchain.signOffchainAttestation(
    {
      recipient,
      expirationTime: 0n,
      time: BigInt(Math.round(new Date().getTime() / 1000)),
      revocable: true,
      version: 1,
      nonce: 0n,
      schema,
      refUID:
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      data: encodedData,
    },
    serverWallet
  );

  return offchainAttestation;
}

function easDomain(verifyingContract?: string) {
  return verifyingContract
    ? {
        name: "Smart-Layer-Attestation-Service",
        chainId: env.CHAIN_ID,
        version: "0.1",
        verifyingContract: verifyingContract,
      }
    : {
        name: "EAS Attestation",
        chainId: env.CHAIN_ID,
        version: "1.2.0",
      };
}

export function verifyOfferForSellingSignature(
  verifyingContract: string,
  offer: {
    token: string;
    id: string;
    receiverIdType: string;
    receiver: string;
    erc20: string;
    price: string;
  },
  signature: string
) {
  const domain = {
    name: "EAS Attestation",
    chainId: env.CHAIN_ID,
    version: "1.2.0",
    verifyingContract,
  };

  const types = {
    Offer: [
      { name: "token", type: "address" },
      { name: "id", type: "uint256" },
      { name: "receiverIdType", type: "string" },
      { name: "receiver", type: "string" },
      { name: "erc20", type: "address" },
      { name: "price", type: "uint256" },
    ],
  };

  return verifyTypedData(domain, types, offer, signature);
}

export function verifyIdSignature(
  id: {
    idType: string;
    value: string;
    secret?: string;
  },
  signature: string
) {
  const idTypes = id.idType === "email" ? emailTypes : types;

  return verifyTypedData(easDomain(), idTypes, id, signature);
}
