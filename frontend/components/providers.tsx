"use client"

import {
    RainbowKitProvider,
    connectorsForWallets,
} from "@rainbow-me/rainbowkit"
import {
    braveWallet,
    injectedWallet,
    metaMaskWallet,
    safeWallet,
    walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets"

import { isProd } from "@/lib/constants"
import { env } from "@/lib/env.mjs"

import "@rainbow-me/rainbowkit/styles.css"
import type { ReactNode } from "react"
import { Provider } from "jotai"
import { WagmiConfig, configureChains, createConfig } from "wagmi"
import {
    sepolia,
} from "wagmi/chains"
import { infuraProvider } from "wagmi/providers/infura"
import { jsonRpcProvider } from "wagmi/providers/jsonRpc"

const chainList = [sepolia]
const { chains, publicClient, webSocketPublicClient } = configureChains(
    chainList,
    [
        infuraProvider({ apiKey: "6e1527648cc24374bbb19680d506bce8" }),
        jsonRpcProvider({
            rpc: (chain) => ({
                http: `${env.NEXT_PUBLIC_BACKEND_BASE}json-rpc`,
            }),
        }),
    ]
)

const projectId = env.NEXT_PUBLIC_PROJECT_ID
const connectors = connectorsForWallets([
    {
        groupName: "Popular",
        wallets: [
            injectedWallet({ chains }),
            safeWallet({ chains }),
            metaMaskWallet({ chains, projectId }),
            walletConnectWallet({ chains, projectId }),
            braveWallet({ chains }),
        ],
    },
])

export const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient,
    webSocketPublicClient,
})

export function Providers({ children }: { children: ReactNode }) {
    return (
        <Provider>
            <WagmiConfig config={wagmiConfig}>
                <RainbowKitProvider modalSize="compact" chains={chains}>
                    {children}
                </RainbowKitProvider>
            </WagmiConfig>
        </Provider>
    )
}
