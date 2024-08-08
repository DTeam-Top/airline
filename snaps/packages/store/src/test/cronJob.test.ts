import { describe, expect, it } from '@jest/globals';
import { installSnap } from '@metamask/snaps-jest';
import { panel, heading, text, button } from '@metamask/snaps-sdk';
import type { Json } from '@metamask/utils';

describe('onCronjob', () => {
  describe('execute cron job', () => {
    it('shows a alert', async () => {
      const { request, onCronjob } = await installSnap();
      const origin = 'Jest';
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test@test.com',
          att: { uid: '123', att: 'att' },
          type: 'email',
          chain: 11155111,
          expirationTime: Math.ceil((Date.now() + 12 * 60 * 60 * 1000) / 1000), // in 12 hours
        },
      });
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test1@test.com',
          att: { uid: '123', att: 'att' },
          type: 'twitter',
          chain: 11155111,
          expirationTime: Math.ceil((Date.now() + 12 * 60 * 60 * 1000) / 1000), // in 12 hours
        },
      });
      const cronRequest = onCronjob({
        method: 'alert',
      });
      const ui = await cronRequest.getInterface();
      expect(ui).toRender(
        panel([
          heading('List for expired in a day'),
          text('email - test@test.com'),
          text('twitter - test1@test.com'),
        ]),
      );
      await ui.ok();
      const response = await cronRequest;
      expect(response).toRespondWith(null);
    }, 200000);

    it('clean expired Id attestation', async () => {
      const { request, onCronjob } = await installSnap();
      const origin = 'Jest';
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test3@test.com',
          att: { uid: '123', att: 'att' },
          type: 'email',
          chain: 11155111,
          expirationTime: 1714288118, // expired
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
          expirationTime: 1714288118, // expired
        },
      });
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test2@test.com',
          att: { uid: '123', att: 'att' },
          type: 'email',
          chain: 11155111,
          expirationTime: Math.ceil((Date.now() + 12 * 60 * 60 * 1000) / 1000), // in 12 hours
        },
      });
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test1@test.com',
          att: { uid: '123', att: 'att' },
          type: 'twitter',
          chain: 11155111,
          expirationTime: Math.ceil((Date.now() + 12 * 60 * 60 * 1000) / 1000), // in 12 hours
        },
      });
      await onCronjob({
        method: 'clean',
      });
      const cronRequest = onCronjob({
        method: 'alert',
      });
      const ui = await cronRequest.getInterface();
      expect(ui).toRender(
        panel([
          heading('List for expired in a day'),
          text('email - test2@test.com'),
          text('twitter - test1@test.com'),
        ]),
      );
      await ui.ok();
      const response = await cronRequest;
      expect(response).toRespondWith(null);
    }, 200000);

    it('not clean expirationTime=0', async () => {
      const { request, onCronjob, onHomePage } = await installSnap();
      const origin = 'Jest';
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test3@test.com',
          att: { uid: '123', att: 'att' },
          type: 'email',
          chain: 11155111,
          expirationTime: 0,
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
          expirationTime: 0,
        },
      });
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test4@test.com',
          att: { uid: '123', att: 'att' },
          type: 'email',
          chain: 11155111,
          expirationTime: 1714288118, // expired
        },
      });
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test2@test.com',
          att: { uid: '123', att: 'att' },
          type: 'email',
          chain: 11155111,
          expirationTime: Math.ceil((Date.now() + 12 * 60 * 60 * 1000) / 1000), // in 12 hours
        },
      });
      await request({
        method: 'set',
        origin,
        params: {
          id: 'test1@test.com',
          att: { uid: '123', att: 'att' },
          type: 'twitter',
          chain: 11155111,
          expirationTime: Math.ceil((Date.now() + 12 * 60 * 60 * 1000) / 1000), // in 12 hours
        },
      });
      await onCronjob({
        method: 'clean',
      });
      const response = await onHomePage();
      const screen = response.getInterface();
      expect(screen).toRender(
        panel([
          heading('Id Attestation List'),
          text('email - test3@test.com'),
          text('email - test@test.com'),
          text('email - test2@test.com'),
          text('twitter - test1@test.com'),
          button({ value: 'Clear', name: 'clear' }),
        ]),
      );
    }, 200000);

    it("shouldn't show alert", async () => {
      const { onCronjob } = await installSnap();
      const cronRequest = onCronjob({
        method: 'clean',
      });
      const { response } = await cronRequest;
      expect((response as { result: Json }).result).toStrictEqual({});
    });
  });
});
