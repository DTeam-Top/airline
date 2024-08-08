import {
  panel,
  text,
  heading,
  button,
  ManageStateOperation,
} from '@metamask/snaps-sdk';

// eslint-disable-next-line jsdoc/require-jsdoc
export async function createHomeInterface() {
  const state = await getState();
  const panelList: any[] = [];
  console.log('panelList---', panelList);
  if (state) {
    for (const key in state) {
      if (
        state[key]?.expirationTime === 0 ||
        (state[key]?.expirationTime &&
          state[key].expirationTime * 1000 > Date.now())
      ) {
        panelList.push(text(`${state[key].type} - ${key}`));
      }
    }
  }

  console.log('panelList---', panelList);

  return {
    content: panel(
      panelList.length > 0
        ? [
            heading('Id Attestation List'),
            ...panelList,
            button({ value: 'Clear', name: 'clear' }),
          ]
        : [text('No Id Attestation List')],
    ),
  };
}

// eslint-disable-next-line jsdoc/require-jsdoc
export async function updateState(content: any) {
  const state = await getState();
  await snap.request({
    method: 'snap_manageState',
    params: {
      operation: ManageStateOperation.UpdateState,
      newState: { ...state, ...content },
    },
  });
}

// eslint-disable-next-line jsdoc/require-jsdoc
export async function getState() {
  return await snap.request({
    method: 'snap_manageState',
    params: {
      operation: ManageStateOperation.GetState,
    },
  });
}

// eslint-disable-next-line jsdoc/require-jsdoc
export async function clearState() {
  return await snap.request({
    method: 'snap_manageState',
    params: {
      operation: ManageStateOperation.ClearState,
    },
  });
}

// eslint-disable-next-line jsdoc/require-jsdoc
export async function cleanExpired() {
  const state = await getState();
  const newState: any = {};
  if (state) {
    for (const key in state) {
      if (
        state[key]?.expirationTime === 0 ||
        (state[key]?.expirationTime &&
          state[key].expirationTime * 1000 > Date.now())
      ) {
        newState[key] = state[key];
      }
    }
    await clearState();
    await updateState(newState);
  }

  return {};
}

// eslint-disable-next-line jsdoc/require-jsdoc
export async function alertExpired() {
  const state = await getState();
  const expireList = [];
  if (state) {
    for (const key in state) {
      if (state[key]?.expirationTime) {
        if (state[key].expirationTime * 1000 < Date.now() + 86400000) {
          expireList.push(text(`${state[key].type} - ${key}`));
        }
      }
    }
  }

  console.log('expireList--', expireList);

  if (expireList.length > 0) {
    return await snap.request({
      method: 'snap_dialog',
      params: {
        type: 'alert',
        content: panel([heading('List for expired in a day'), ...expireList]),
      },
    });
  }
  return null;
}

// eslint-disable-next-line jsdoc/require-jsdoc
export async function fetchAttestation() {
  const state = await getState();
  console.log('state---', state);
  return null;
}

// eslint-disable-next-line jsdoc/require-jsdoc
export async function getAttestation(id: string, type: string, chain: number) {
  const state = await getState();

  console.log('state---', id, type, chain);
  console.log(JSON.stringify(state));
  if (state?.[id]) {
    return state[id];
  }
  return null;
}
