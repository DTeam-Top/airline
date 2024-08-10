import { atom } from "jotai"

import { EasAttestations } from "@/lib/types"

export const easAttestationsAtom = atom<EasAttestations>([])
export const getEasAttestationsAtom = atom((get) => get(easAttestationsAtom))

export const setEasAttestationsAtom = atom(
  null,
  async (get, set, address: string | undefined) => {
    if (address) {
      try {
      } catch (e: any) {
        if (e.response.data && e.response.data.message === "not found") {
          set(easAttestationsAtom, [])
        }
      }
    }
  }
)

export const confirmInstallSnapAtom = atom<boolean>(true)
export const getConfirmInstallSnapAtom = atom((get) =>
  get(confirmInstallSnapAtom)
)

export const setConfirmInstallSnapAtom = atom(
  null,
  async (get, set, address: string | undefined, confirm: boolean) => {
    if (address) {
      try {
        set(confirmInstallSnapAtom, confirm)
      } catch (e: any) {
        console.log(e.response.data)
        if (e.response.data && e.response.data.message === "not found") {
          set(confirmInstallSnapAtom, false)
        }
      }
    }
  }
)
