import {verifyMessage} from 'ethers';
import {FastifyInstance, FastifyReply, FastifyRequest} from 'fastify';
import {z} from 'zod';
import {MAX_LIMIT, SUPPORT_TYPES} from '../constant';
import {
  createIdAttestation,
  getAttester,
  getEasAttestationByAttester,
  getEasAttestationByDecoded,
  getEasAttestationRawDataByAttester,
  getIdAttestationsByType,
  getIdStatus,
  getIssuerByRecipient,
  listAttestationsByAttester,
  listAttestationsByAttesterAndSubject,
  listAttestationsBySubject,
  normalize,
  saveAttestation,
  verifyIdSignature,
} from '../services/easAttestationService';
import {verifySecret} from '../services/idSecretService';
import {DbService} from '../_core/services/dbService';
import {Action} from '../_core/type';
import {
  attestIdPostSchema,
  AttestIdRequest,
  PostAttestation,
  postAttestationSchema,
} from './requestSchemas';
export const getAttestation: Action = {
  path: '/:attester/:tokenId',
  method: 'get',
  options: {
    schema: {
      params: z.object({
        attester: z.string(),
        tokenId: z.string(),
      }),
    },
  },
  handler: getAttestationHandler,
};

async function getAttestationHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const {attester, tokenId} = request.params as {
    attester: string;
    tokenId: string;
  };

  const dbService: DbService = this.diContainer.resolve('dbService');
  const attestation = await getEasAttestationByAttester(
    dbService,
    attester,
    tokenId
  );

  if (!attestation) {
    await reply.status(404).send({message: 'not found'});
    return;
  }

  return attestation;
}

export const listAttestations: Action = {
  path: '',
  method: 'get',
  options: {
    schema: {
      querystring: z.object({
        attester: z.string().optional(),
        subject: z.string().optional(),
        startAt: z.coerce.number().default(0),
        max: z.coerce.number().default(MAX_LIMIT),
      }),
    },
  },
  handler: listAttestationsHandler,
};

async function listAttestationsHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  let {attester, subject, startAt, max} = request.query as {
    attester?: string;
    subject?: string;
    startAt: number;
    max: number;
  };

  max = Math.min(MAX_LIMIT, max);

  if (!attester && !subject) {
    await reply
      .status(400)
      .send({message: 'at least one of attester or subject is required'});
    return;
  }

  const dbService: DbService = this.diContainer.resolve('dbService');
  let attestations: any[] = [];

  if (attester && subject) {
    attestations = await listAttestationsByAttesterAndSubject(
      dbService,
      attester,
      subject,
      startAt,
      max
    );
  } else if (subject) {
    attestations = await listAttestationsBySubject(
      dbService,
      subject,
      startAt,
      max
    );
  } else if (attester) {
    attestations = await listAttestationsByAttester(
      dbService,
      attester,
      startAt,
      max
    );
  }

  if (!attestations.length) {
    await reply.status(404).send({message: 'not found'});
    return;
  }

  return attestations;
}

export const uploadingAttestation: Action = {
  path: '',
  method: 'post',
  options: {
    schema: {
      body: postAttestationSchema,
    },
  },
  handler: uploadingAttestationHandler,
};

async function uploadingAttestationHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = request.body as PostAttestation;
  const offchainAttestation = normalize(JSON.parse(data.attestation));
  const account = verifyMessage(data.attestation, data.signature);

  if (data.by === 'attester') {
    if (getAttester(offchainAttestation) !== account) {
      await reply
        .status(400)
        .send({message: 'only attester or recipient can upload attestations.'});
      return;
    }
  } else if (data.by === 'subject') {
    if (offchainAttestation.message.recipient !== account) {
      await reply
        .status(400)
        .send({message: 'only attester or recipient can upload attestations.'});
      return;
    }
  } else {
    await reply.status(400).send({message: 'invalid "by"'});
    return;
  }

  const dbService: DbService = this.diContainer.resolve('dbService');

  return await saveAttestation(dbService, offchainAttestation);
}

export const getAttestationRawdata: Action = {
  path: '/:attester/:tokenId/:chain/rawdata',
  method: 'get',
  options: {
    schema: {
      params: z.object({
        attester: z.string(),
        tokenId: z.string(),
        chain: z.string(),
      }),
      querystring: z.object({message: z.string(), signature: z.string()}),
    },
  },
  handler: getAttestationRawDataHandler,
};

async function getAttestationRawDataHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const {attester, tokenId, chain} = request.params as {
    attester: string;
    tokenId: string;
    chain: string;
  };

  const dbService: DbService = this.diContainer.resolve('dbService');
  const attestation = await getEasAttestationRawDataByAttester(
    dbService,
    attester,
    tokenId,
    chain
  );

  if (!attestation) {
    await reply.status(404).send({message: 'not found'});
    return;
  }

  return attestation;
}

export const getAttestationByDecoded: Action = {
  path: '/:token/:tokenId/:schema',
  method: 'get',
  options: {
    schema: {
      params: z.object({
        token: z.string(),
        tokenId: z.string(),
        schema: z.string(),
      }),
      querystring: z.object({message: z.string(), signature: z.string()}),
    },
  },
  handler: getAttestationByDecodedHandler,
};

async function getAttestationByDecodedHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const {token, tokenId, schema} = request.params as {
    token: string;
    tokenId: string;
    schema: string;
  };

  const dbService: DbService = this.diContainer.resolve('dbService');
  const attestation = await getEasAttestationByDecoded(
    dbService,
    schema,
    token,
    tokenId
  );

  return attestation;
}

export const createIdAttestationAction: Action = {
  path: '/id',
  method: 'post',
  options: {
    schema: {
      body: attestIdPostSchema,
    },
  },
  handler: createIdAttestationHandler,
};

async function createIdAttestationHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const data = request.body as AttestIdRequest;
  const dbService: DbService = this.diContainer.resolve('dbService');
  console.log(data);

  if (data.id.idType === 'email' && data.id.secret) {
    const secretVerified = await verifySecret(
      dbService,
      'email',
      data.id.value,
      Number(data.id.secret)
    );

    if (!secretVerified) {
      reply.status(401).send({message: 'OTP not match'});
      return;
    }
  }

  if (data.idSignature !== 'validated') {
    const receiver = verifyIdSignature(data.id, data.idSignature);
    console.log('receiver', receiver, data.receiver);
    if (receiver !== data.receiver) {
      reply.status(401).send({message: 'Invalid signature'});
      return;
    }
  }

  const attestation = await createIdAttestation(
    data.id.idType,
    data.id.value,
    data.receiver,
    data.scriptURI,
    data.expireTime
  );

  return await saveAttestation(dbService, attestation);
}

export const getIssuersByRecipient: Action = {
  path: '/:recipient',
  method: 'get',
  options: {
    schema: {
      params: z.object({
        recipient: z.string(),
      }),
    },
  },
  handler: getIssuersByRecipientHandler,
};

async function getIssuersByRecipientHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const {recipient} = request.params as {
    recipient: string;
  };

  const dbService: DbService = this.diContainer.resolve('dbService');
  const attestation = await getIssuerByRecipient(dbService, recipient);

  return attestation;
}

export const listIdAttestations: Action = {
  path: '/ids/:type',
  method: 'get',
  options: {
    schema: {
      params: z.object({
        type: z.string(),
      }),
      querystring: z.object({
        startAt: z.coerce.number().default(0),
        max: z.coerce.number().default(MAX_LIMIT),
      }),
    },
  },
  handler: listIdAttestationsHandler,
};

async function listIdAttestationsHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const {type} = request.params as {
    type: string;
  };

  let {startAt, max} = request.query as {
    startAt: number;
    max: number;
  };

  max = Math.min(MAX_LIMIT, max);

  if (SUPPORT_TYPES.indexOf(type) === -1) {
    await reply.status(400).send({message: `${type} not supported`});
    return;
  }

  const dbService: DbService = this.diContainer.resolve('dbService');
  const attestation = await getIdAttestationsByType(
    dbService,
    type,
    startAt,
    max
  );

  return attestation;
}

export const getIdAttestationsStatus: Action = {
  path: '/ids/status',
  method: 'get',
  options: {
    schema: {},
  },
  handler: getIdAttestationsStatusHandler,
};

async function getIdAttestationsStatusHandler(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const dbService: DbService = this.diContainer.resolve('dbService');
  const result = await getIdStatus(dbService);

  return result;
}
