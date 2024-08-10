import type {
  OnCronjobHandler,
  OnHomePageHandler,
  OnRpcRequestHandler,
  OnUserInputHandler,
} from '@metamask/snaps-sdk';
import { panel, text, UserInputEventType } from '@metamask/snaps-sdk';

import {
  cleanExpired,
  clearState,
  createHomeInterface,
  fetchAttestation,
  getAttestation,
  updateState,
} from './ui';

// /**
//  * Handle incoming home page requests from the MetaMask clients.
//  *
//  * @returns A static panel rendered with custom UI.
//  * @see https://docs.metamask.io/snaps/reference/exports/#onhomepage
//  */

export const onHomePage: OnHomePageHandler = async () => {
  const interfaceContent = await createHomeInterface();
  console.log('interfaceContent----', interfaceContent);
  return interfaceContent;
};

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  console.log('snap ----onRpcRequest', origin, request.method, request.params);
  switch (request.method) {
    case 'get': {
      const result = await getAttestation(
        request.params?.id,
        request.params?.type,
        request.params?.chain,
      );
      return result
        ? {
            id: result.id,
            type: result.type,
            chain: result.chain,
            expirationTime: result.expirationTime,
            attestation: result.att,
          }
        : {
            attestation: 'no attestation',
          };
      break;
    }
    case 'set': {
      if (
        request.params?.id &&
        request.params?.att &&
        request.params?.chain &&
        request.params?.type &&
        request.params?.expirationTime !== undefined
      ) {
        const content: any = {};
        content[request.params.id] = {
          id: request.params.id,
          att: request.params.att,
          chain: request.params.chain,
          type: request.params.type,
          expirationTime: request.params.expirationTime,
        };
        await updateState(content);
      }
      return { success: true };
      break;
    }

    default:
      throw new Error('Method not found.');
  }
};

export const onCronjob: OnCronjobHandler = async ({ request }) => {
  switch (request.method) {
    case 'clean': {
      console.log('cron job clean--', new Date());
      return await cleanExpired();
      break;
    }
    // case 'alert': {
    //   console.log('cron job alert--', new Date());
    //   return await alertExpired();
    //   break;
    // }
    case 'fetch': {
      console.log('cron job fetch--', new Date());
      return await fetchAttestation();
      break;
    }

    default:
      throw new Error('Method not found.');
  }
};

export const onUserInput: OnUserInputHandler = async ({ id, event }) => {
  console.log('snap ----', id, event.type, event.name);
  if (event.type === UserInputEventType.ButtonClickEvent) {
    switch (event.name) {
      case 'clear': {
        await clearState();
        await snap.request({
          method: 'snap_updateInterface',
          params: {
            id,
            ui: panel([text('No Id Attestation List')]),
          },
        });
        break;
      }
      default:
        break;
    }
  }
};
