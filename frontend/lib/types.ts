import { ValueSchema } from "@latticexyz/protocol-parser/internal"

export type EasAttestations = Array<{
  email: string
  attester: string
  uid: string
}>

export type IDData = {
  idType: string
  value: string | null
  secret?: string
}

const signatureSchema: ValueSchema = {
  signatureV: "uint8", // The recovery ID.
  signatureR: "bytes32", // The x-coordinate of the nonce R.
  signatureS: "bytes32", // The signature data.
}

const receiverSchema: ValueSchema = {
  provider: "string",
  id: "string",
}

const paymentSchema: ValueSchema = {
  erc20: "address",
  amount: "uint256",
}

export const rawDataSchemas: {
  [key: string]: ValueSchema
} = {
  staticId: {
    subject: "address",
    ...receiverSchema,
  },
  saleOffer: {
    token: "address",
    tokenId: "uint256",
    ...paymentSchema,
    ...signatureSchema,
    ...receiverSchema,
  },
}
