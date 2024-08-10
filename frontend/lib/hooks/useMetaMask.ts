import { defaultSnapOrigin } from "../constants"
import { GetSnapsResponse } from "../types/snap"

export const detectFlask = async (provider: any) => {
  const clientVersion = await provider.send("web3_clientVersion")

  return (clientVersion as string[])?.includes("flask")
}

export const getSnap = async (provider: any) => {
  const snaps = (await provider.send("wallet_getSnaps")) as GetSnapsResponse
  return snaps[defaultSnapOrigin] ?? null
}
