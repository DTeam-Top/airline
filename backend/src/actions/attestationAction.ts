import { ethers } from "ethers";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Action } from "../_core/type";
import { SCHEMAS, serverWallet } from "../constant";
import { env } from "../env";
import {
  createAndUploadSellingOffserAttestation,
  verifyIdSignature,
  verifyOfferForSellingSignature,
} from "../services/easAttestationService";
import { getApproved, ownerOf } from "../services/ethersService";
import {
  createIdAttest,
  findByDecoded,
  getRawdata,
} from "../services/externalApi";
import {
  AttestIdRequest,
  SellingOfferRequest,
  attestIdPostSchema,
  rawdataRequestSchema,
  sellingOfferPostSchema,
} from "./requestSchemas";

export const createSellingOffer: Action = {
  path: "/selling-offers",
  method: "post",
  options: {
    schema: {
      body: sellingOfferPostSchema,
    },
  },
  handler: createSellingOfferHandler,
};

async function createSellingOfferHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = request.body as SellingOfferRequest;
  const seller = verifyOfferForSellingSignature(
    data.dvp,
    data.offer,
    data.signature
  );
  const owner = await ownerOf(data.offer.token, data.offer.id);
  if (owner !== seller) {
    reply.status(401).send({ message: `This nft is not owned by you` });
    return;
  }

  // verify dvp contract == new contract(token, nftAbi).getApproved(id)
  const isApproved = await getApproved(
    seller,
    data.offer.token,
    data.offer.id,
    data.dvp
  );

  if (!isApproved) {
    reply.status(400).send({ message: "Not approved" });
    return;
  }
  // verify there is no duplicate in db, findByDecoded({token, id, schemaId})
  const wallet = new ethers.Wallet(env.ATTESTER_SK);
  const message = `${data.offer.id}-${JSON.stringify(data.offer.token)}`;
  const signature = await wallet.signMessage(message);

  const attestation = await findByDecoded(
    data.offer.token,
    data.offer.id,
    SCHEMAS!.offerForSelling[1],
    message,
    signature
  );

  if (attestation.data) {
    //reply.status(400).send({ message: "duplicate" });

    return { attester: attestation.data.attester, uid: attestation.data.uid };
  }

  const result = await createAndUploadSellingOffserAttestation(
    data,
    seller,
    data.scriptURI
  );
  return { attester: result.data.attester, uid: result.data.uid };
}

export const createIdAttestAction: Action = {
  path: "/id",
  method: "post",
  options: {
    schema: {
      body: attestIdPostSchema,
    },
  },
  handler: createIdAttestHandler,
};

async function createIdAttestHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = request.body as AttestIdRequest;

  const receiver = verifyIdSignature(data.id, data.signature);

  if (receiver !== data.receiver) {
    reply.status(401).send({ message: "Invalid signature" });
    return;
  }

  try {
    const result = await createIdAttest(
      data.id,
      data.signature,
      data.expireTime,
      await serverWallet.signMessage(JSON.stringify(data.id)),
      data.receiver
    );

    reply.status(201).send(result.data.rawData);
  } catch (e: any) {
    if (e.response && e.response.data) {
      reply.status(500).send(e.response.data);
    } else {
      reply.status(500).send({ message: e.message });
    }
  }
}

export const getAttestationRawdata: Action = {
  path: "/:attester/:tokenId/:chain/rawdata",
  method: "get",
  options: {
    schema: {
      params: rawdataRequestSchema,
    },
  },
  handler: getAttestationRawDataHandler,
};

async function getAttestationRawDataHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { attester, tokenId, chain } = request.params as {
    attester: string;
    tokenId: string;
    chain: string;
  };

  const wallet = new ethers.Wallet(env.ATTESTER_SK);
  const message = `${attester}-${tokenId}`;
  const signature = await wallet.signMessage(message);
  try {
    const attestation = await getRawdata(
      attester,
      tokenId,
      message,
      signature,
      chain
    );

    if (!attestation || !attestation.data) {
      reply.status(404).send({ message: "Not found" });
      return;
    }

    reply.status(201).send(attestation.data);
  } catch (e: any) {
    console.log(e);
    reply.status(404).send({ message: e.message });
    return;
  }
}
