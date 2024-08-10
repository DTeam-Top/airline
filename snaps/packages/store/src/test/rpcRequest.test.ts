import { describe, expect, it } from '@jest/globals';
import { installSnap } from '@metamask/snaps-jest';
import type { Json } from '@metamask/utils';

describe('onRpcRequest', () => {
  describe('getNoAttestation', () => {
    it('no attestation', async () => {
      const { request } = await installSnap();
      const origin = 'Jest';
      const response = await request({
        method: 'get',
        origin,
      });
      expect((response.response as { result: Json }).result).toStrictEqual({
        attestation: 'no attestation',
      });
    });

    it('get right attestation', async () => {
      const { request } = await installSnap();
      const origin = 'Jest';
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test@test.com',
          att: { uid: '123', att: 'att' },
          type: 'email',
          chain: 11155111,
          expirationTime: 1910926706,
        },
      });
      const getResponse = await request({
        method: 'get',
        origin,
        params: {
          id: 'test@test.com',
          type: 'email',
          chain: 11155111,
        },
      });
      expect((getResponse.response as { result: Json }).result).toStrictEqual({
        attestation: { uid: '123', att: 'att' },
        chain: 11155111,
        expirationTime: 1910926706,
        id: 'test@test.com',
        type: 'email',
      });
    });
  });

  it('duplicate attestation', async () => {
    const { request } = await installSnap();
    const origin = 'Jest';
    await request({
      method: 'set',
      origin,
      params: {
        id: 'test@test.com',
        att: { uid: '123', att: 'att' },
        type: 'email',
        chain: 11155111,
        expirationTime: 1910926706,
      },
    });
    await request({
      method: 'set',
      origin,
      params: {
        id: 'test@test.com',
        att: { uid: '123', att: 'att' },
        type: 'email',
        chain: 11155111,
        expirationTime: 1910926700,
      },
    });
    await request({
      method: 'set',
      origin,
      params: {
        id: 'test@test.com',
        att: { uid: '123', att: 'att' },
        type: 'email',
        chain: 11155111,
        expirationTime: 1910926706,
      },
    });
    const getResponse = await request({
      method: 'get',
      origin,
      params: {
        id: 'test@test.com',
        type: 'email',
        chain: 11155111,
      },
    });
    expect((getResponse.response as { result: Json }).result).toStrictEqual({
      attestation: { uid: '123', att: 'att' },
      id: 'test@test.com',
      type: 'email',
      chain: 11155111,
      expirationTime: 1910926706,
    });
  });

  describe('set', () => {
    it('save attestation', async () => {
      const { request } = await installSnap();

      const origin = 'Jest';
      const response = await request({
        method: 'set',
        origin,
        params: {
          id: 'id',
          att: 'att',
          type: 'email',
          chain: 'chain',
        },
      });
      expect((response.response as { result: Json }).result).toStrictEqual({
        success: true,
      });
    });
  });

  it('throws an error if the requested method does not exist', async () => {
    const { request } = await installSnap();

    const response = await request({
      method: 'foo',
    });

    expect(response).toRespondWithError({
      code: -32603,
      message: 'Method not found.',
      stack: expect.any(String),
    });
  });
});
