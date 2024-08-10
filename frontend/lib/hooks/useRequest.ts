//import type { RequestArguments } from "@metamask/providers"

import { useMetaMaskContext } from "./MetamaskContext"

export declare type RequestArguments = {
  provider: any
  /** The RPC method to request. */
  method: string
  /** The params of the RPC method, if any. */
  params?: unknown[] | Record<string, unknown>
}

export type Request = (params: RequestArguments) => Promise<unknown | null>

/**
 * Utility hook to consume the provider `request` method with the available provider.
 *
 * @returns The `request` function.
 */
export const useRequest = () => {
  //const { provider, setError } = useMetaMaskContext()

  /**
   * `provider.request` wrapper.
   *
   * @param params - The request params.
   * @param params.method - The method to call.
   * @param params.params - The method params.
   * @returns The result of the request.
   */
  const request: Request = async ({ method, params, provider }) => {
    try {
      return (await provider?.send(method, params)) ?? null
    } catch (requestError: any) {
      //setError(requestError)
      console.log(requestError)

      return null
    }
  }

  return request
}
