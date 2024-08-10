import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react"
import type { MetaMaskInpageProvider } from "@metamask/providers"

import { Snap } from "../types/snap"
import { getSnapsProvider } from "../utils/metamask"

type MetaMaskContextType = {
    provider: MetaMaskInpageProvider | null
    installedSnap: Snap | null
    installedSnapB: Snap | null
    error: Error | null
    setInstalledSnap: (snap: Snap | null) => void
    setError: (error: Error) => void
}

export const MetaMaskContext = createContext<MetaMaskContextType>({
    provider: null,
    installedSnap: null,
    installedSnapB: null,
    error: null,
    setInstalledSnap: () => {
        /* no-op */
    },
    setError: () => {
        /* no-op */
    },
})

/**
 * MetaMask context provider to handle MetaMask and snap status.
 *
 * @param props - React Props.
 * @param props.children - React component to be wrapped by the Provider.
 * @returns JSX.
 */
export const MetaMaskProvider = ({ children }: { children: ReactNode }) => {
    const [provider, setProvider] = useState<MetaMaskInpageProvider | null>(null)
    const [installedSnap, setInstalledSnap] = useState<Snap | null>(null)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        getSnapsProvider().then(setProvider).catch(console.error)
    }, [])

    useEffect(() => {
        if (error) {
            const timeout = setTimeout(() => {
                setError(null)
            }, 10000)

            return () => {
                clearTimeout(timeout)
            }
        }

        return undefined
    }, [error])

    return (
        <MetaMaskContext.Provider
            value={{
                provider,
                error,
                setError,
                installedSnap,
                setInstalledSnap,
            }}
        >
            {children}
        </MetaMaskContext.Provider>
    )
}

/**
 * Utility hook to consume the MetaMask context.
 *
 * @returns The MetaMask context.
 */
export function useMetaMaskContext() {
    return useContext(MetaMaskContext)
}
