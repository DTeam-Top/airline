import { defaultSnapOrigin } from "../constants"
import { Snap } from "../types/snap"
import { useMetaMaskContext } from "./MetamaskContext"
import { useRequest } from "./useRequest"

/**
 * Utility hook to wrap the `wallet_requestSnaps` method.
 *
 * @param snapId - The requested Snap ID. Defaults to the snap ID specified in the
 * config.
 * @param version - The requested version.
 * @returns The `wallet_requestSnaps` wrapper.
 */
export const useRequestSnap = (
  snapId = defaultSnapOrigin,
  version?: string
) => {
  const request = useRequest()
  const { setInstalledSnap } = useMetaMaskContext()

  /**
   * Request the Snap.
   */
  return async (provider: any) => {
    const snaps = (await request({
      provider,
      method: "wallet_requestSnaps",
      params: {
        [snapId]: version ? { version } : {},
      },
    })) as Record<string, Snap>

    console.log("snap--", snaps, snapId, version)

    // Updates the `installedSnap` context variable since we just installed the Snap.
    setInstalledSnap(snaps?.[snapId] ?? null)
  }
}
