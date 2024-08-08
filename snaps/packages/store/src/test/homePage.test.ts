import { describe, expect, it } from '@jest/globals';
import { installSnap } from '@metamask/snaps-jest';
import { panel, heading, text, button } from '@metamask/snaps-sdk';

describe('onHomePage', () => {
  it('returns right UI', async () => {
    const { request, onHomePage } = await installSnap();
    const origin = 'Jest';
    await request({
      method: 'set',
      origin,
      params: {
        id: 'test@test.com',
        att: { uid: '123', att: 'att' },
        type: 'email',
        chain: 11155111,
        expirationTime: Math.ceil((Date.now() + 12 * 60 * 60 * 1000) / 1000), // expired
      },
    });

    const response = await onHomePage();

    const screen = response.getInterface();

    expect(screen).toRender(
      panel([
        heading('Id Attestation List'),
        text('email - test@test.com'),
        button({ value: 'Clear', name: 'clear' }),
      ]),
    );
  });

  it('clear data', async () => {
    const { request, onHomePage } = await installSnap();
    const origin = 'Jest';
    await request({
      method: 'set',
      origin,
      params: {
        id: 'test@test.com',
        att: { uid: '123', att: 'att' },
        type: 'email',
        chain: 11155111,
        expirationTime: Math.ceil((Date.now() + 12 * 60 * 60 * 1000) / 1000), // expired
      },
    });

    const response = await onHomePage();

    let ui = response.getInterface();
    await ui.clickElement('clear');
    ui = response.getInterface();
    expect(ui).toRender(panel([text('No Id Attestation List')]));
  });

  it('returns custom UI for no data', async () => {
    const { onHomePage } = await installSnap();

    const response = await onHomePage();

    const screen = response.getInterface();

    expect(screen).toRender(panel([text('No Id Attestation List')]));
  });
});
