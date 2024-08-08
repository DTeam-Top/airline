import {ethers} from 'ethers';
import {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from 'fastify';
import {env} from '../../env';
import {applyRules} from '../services/securityService';
import {Action, Controller, SecurityFilterRule} from '../type';

export function buildRoutes(
  controllers: Controller[],
  urlSecurityRules: SecurityFilterRule[] = []
) {
  return async (fastify: FastifyInstance) => {
    controllers.forEach(controller => {
      fastify.register(buildController(controller.actions), {
        prefix: controller.prefix,
      });
    });

    if (urlSecurityRules.length) {
      fastify.addHook('preHandler', buildSecurityVerifer(urlSecurityRules));
    }
  };
}

function buildController(actions: Action[]) {
  return async (fastify: FastifyInstance) => {
    actions.forEach(action => {
      fastify[action.method](action.path, action.options ?? {}, action.handler);
    });
  };
}

function buildSecurityVerifer(urlSecurityRules: SecurityFilterRule[] = []) {
  return (
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction
  ) => {
    const matched = applyRules(request.url, request.method, urlSecurityRules);
    if (matched) {
      try {
        if (sessionVerify(request)) {
          const message = request.session.siwe!.message;
          request.user = {
            name: message!.address,
            loginMethod: 'siwe',
            loginInfo: message,
          };
        } else if (signatureVerify(request)) {
          const verifyInfo = getVerifyInfo(request);
          const recovered = ethers.verifyMessage(
            `${verifyInfo.message}`,
            verifyInfo.signature
          );
          request.user = {
            name: recovered,
            loginMethod: 'signature',
            loginInfo: {
              verify: verifyInfo.message,
              signedMessage: verifyInfo.signature,
            },
          };
        } else {
          reply.code(401).send({message: 'Unauthorized'});
        }
      } catch (err: any) {
        reply.code(401).send({message: 'Auth failed', err: err.message});
      }
    }
    done();
  };
}

function sessionVerify(request: FastifyRequest): boolean {
  return !!request.session.siwe?.message;
}

function signatureVerify(request: FastifyRequest): boolean {
  const verifyInfo = getVerifyInfo(request);
  if (!(verifyInfo.message && verifyInfo.signature)) {
    return false;
  }
  const recovered = ethers.verifyMessage(
    `${verifyInfo.message}`,
    verifyInfo.signature
  );
  if (env.WALLET_ADDRESS_WHITELIST?.includes(recovered)) {
    return true;
  }
  return false;
}

function getVerifyInfo(request: FastifyRequest) {
  let verifyInfo;

  if (request.method === 'GET') {
    const {message, signature} = (request.query as any) ?? {};
    verifyInfo = {message, signature};
  } else {
    const {message, signature} = (request.body as any) ?? {};
    verifyInfo = {message, signature};
  }

  return verifyInfo;
}
