"use client"

import { useEffect, useState } from "react"
import { IFrameEthereumProvider } from "@ledgerhq/iframe-provider"
import axios from "axios"
import { ethers } from "ethers"
import { useAtomValue, useSetAtom } from "jotai"

import {
    DVP_ABI,
    DVP_CONTRACT_ADDRESS,
    ERC20_ABI,
    NO_ATTESTATION,
    TX_ROOT,
    ZERO_ADDRESS,
} from "@/lib/constants"
import { env } from "@/lib/env.mjs"
import { useInvokeSnap } from "@/lib/hooks/useInvokeSnap"
import { detectFlask, getSnap } from "@/lib/hooks/useMetaMask"
import { useRequestSnap } from "@/lib/hooks/useRequestSnap"
import { decodeRawData } from "@/lib/provider"
import {
    getConfirmInstallSnapAtom,
    setConfirmInstallSnapAtom,
} from "@/lib/store/easAttestationsStore"
import { Snap } from "@/lib/types/snap"
import { prepareAttestation } from "@/lib/utils"

import { Loading } from "./loading"
import { SpinLoading } from "./spin-loading"
import { Dialog, DialogContent } from "./ui/dialog"

export const BuyerSection = () => {
    const [walletAddress, setWalletAddress] = useState("")
    const [chainId, setChainId] = useState("")
    const [offerAttestation, setOfferAttestation] = useState(null)
    const [idAttestation, setIdAttestation] = useState(null)
    const [email, setEmail] = useState("")
    const [erc20, setErc20] = useState("")
    const [token, setToken] = useState("")
    const [tokenId, setTokenId] = useState("")
    const [price, setPrice] = useState("")
    const [image, setImage] = useState("")
    const [verifyLoading, setVerifyLoading] = useState(false)
    const [buyBtnHidden, setBuyBtnHidden] = useState(true)
    const [buyLoading, setBuyLoading] = useState(false)
    const [approveLoading, setApproveLoading] = useState(false)
    const [approved, setApproved] = useState(false)
    const [error, setError] = useState("")
    const [txURL, settxURL] = useState("")
    const [open, setOpen] = useState(false)
    const [isFlask, setIsFlask] = useState(false)
    const [snapsDetected, setSnapsDetected] = useState(false)
    const [installedSnap, setInstalledSnap] = useState<Snap | null>(null)
    const [loaded, setLoaded] = useState(false)
    const requestSnap = useRequestSnap()
    const invokeSnap = useInvokeSnap()

    const setConfirmInstallSnap = useSetAtom(setConfirmInstallSnapAtom)
    const confirmInstallSnap = useAtomValue(getConfirmInstallSnapAtom)
    const [ethereum, setEthereum] = useState<any>(null)


    const attestationSite = new URL(env.NEXT_PUBLIC_ATTESTATION_FRONTEND).origin

    useEffect(() => {
        if (typeof window !== "undefined" && !ethereum) {
            console.log('$$########')
            let ethereumProvider = new IFrameEthereumProvider()
            setEthereum(ethereumProvider)
            ethereumProvider.send("page_ready")
        }
    }, [ethereum])

    // eslint-disable-next-line sonarjs/cognitive-complexity
    useEffect(() => {

        const setAttestations = async (attestation: any) => {
            const response = await invokeSnap({
                provider: ethereum,
                method: "set",
                params: {
                    id: email,
                    att: attestation,
                    chain: env.NEXT_PUBLIC_CHAIN_ID,
                    type: "email",
                    expirationTime: attestation.message.expirationTime,
                },
            })
            console.log(response)
        }
        if (typeof window !== "undefined" && ethereum) {
            window.addEventListener(
                "message",
                (message) => {
                    if (message.data instanceof Object && message.data.attestation) {
                        //get saler attestation
                        if (message.data.type === "attestation") {
                            setOfferAttestation(message.data.attestation)
                        } else if (message.data.type === "id-att") {
                            //get id attestation
                            console.log("id Atttestation", message.data.attestation)
                            setAttestations(message.data.attestation)
                            setIdAttestation(message.data.attestation)
                            setOpen(message.data.display)
                            setBuyBtnHidden(false)
                        }
                    }

                    //get offer info
                    if (message.data instanceof Object && message.data.rawData) {
                        const offerInfo = decodeRawData(message.data.rawData)
                        setEmail(offerInfo.id.toString())
                        setErc20(offerInfo.erc20.toString())
                        setToken(offerInfo.token.toString())
                        setTokenId(offerInfo.tokenId.toString())
                        setPrice(ethers.formatEther(offerInfo.amount.toString()))
                    }

                    //call idattestation iframe
                    if (message.data.ready) {
                        const option = { email: email }
                        let attestationFrame = document.getElementById("attIframe")
                        sendMessage(attestationFrame, option)
                    }
                },
                false
            )

        }
        function sendMessage(iframe: any, option: any) {
            let iframeWin = iframe.contentWindow
            iframeWin.postMessage(option, attestationSite)
        }
    }, [attestationSite, email, ethereum, invokeSnap])

    useEffect(() => {
        async function getMetadata() {
            const result = await axios.get(
                `https://resources.smarttokenlabs.com/${chainId}/${token.toLowerCase()}/${tokenId}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            )
            setImage(result.data.image)
        }
        //load image
        if (chainId && token && tokenId) {
            getMetadata()
        }
    }, [chainId, token, tokenId])

    useEffect(() => {
        const getWallet = async () => {
            setWalletAddress((await ethereum.send("eth_accounts", []))[0].address)
        }

        const getChain = async () => {
            setChainId(await ethereum.send("net_version"))
        }

        if (ethereum && !walletAddress) {
            getWallet()
            getChain()
        }
    }, [walletAddress, ethereum])

    useEffect(() => {
        const getMetaMaskInfo = async () => {
            setIsFlask(await detectFlask(ethereum))
            setSnapsDetected(true)
            setInstalledSnap(await getSnap(ethereum))
            setLoaded(true)
        }
        if (ethereum && !loaded) {
            getMetaMaskInfo()
            console.log("getMetaMaskInfo", isFlask, snapsDetected, installedSnap)
        }
    }, [ethereum, installedSnap, isFlask, snapsDetected, loaded])

    const approveHandler = async () => {

        setApproveLoading(true)

        const txHash = await approveERC20(ZERO_ADDRESS, price)
        console.log("txHash---", txHash)
        const timer = setInterval(async () => {
            try {
                const transaction = await ethereum.send("eth_getTransactionReceipt", [
                    txHash,
                ])
                console.log(transaction)

                setApproveLoading(false)
                setApproved(true)
                clearInterval(timer)
            } catch (e) {
                console.log(e)
            }
        }, 1000)
    }

    async function approveERC20(erc20Address: string, amount: string) {
        const encodeData = await ethereum.send("eth_encodeData", {
            contract: erc20Address,
            abi: ERC20_ABI,
            data: [
                DVP_CONTRACT_ADDRESS,
                ethers.toBeHex(ethers.parseUnits(amount, 18).toString()),
            ],
            function: "approve",
        })
        const result = await ethereum.send("eth_sendTransaction", [
            {
                from: walletAddress,
                to: erc20Address,
                data: encodeData,
                gasLimit: ethers.toBeHex(6000000),
            },
        ])

        console.log(result)
        return result
    }

    const verifyHandler = async () => {
        try {
            console.log("verify---", new Date(), confirmInstallSnap, isFlask)
            let attestation
            if (confirmInstallSnap && isFlask) {
                attestation = await getAttestations()
                if (!attestation) {
                    //setConfirmInstallSnap(walletAddress, false)
                } else {
                    if (attestation === NO_ATTESTATION) {
                        // openAttestionDialog()
                    } else {
                        setVerifyLoading(true)
                        setBuyBtnHidden(true)
                        setError("")
                        setIdAttestation(attestation)
                        setBuyBtnHidden(false)
                    }
                }
            } else {
                //openAttestionDialog()
            }
        } catch (e: any) {
            console.log(e.response)
            if (e.response && e.response.data) {
                setError(e.response.data.message)
            } else {
                setError(e.message)
            }
        } finally {
            setVerifyLoading(false)
        }
    }

    const openAttestionDialog = () => {
        setVerifyLoading(true)
        setBuyBtnHidden(true)
        setError("")
        setOpen(true)
    }

    const getAttestations = async () => {
        const result = await requestSnap(ethereum)
        console.log("email--", result, email, installedSnap, isFlask, snapsDetected)

        const response: any = await invokeSnap({
            provider: ethereum,
            method: "get",
            params: { id: email },
        })

        console.log("response", response)
        return response?.attestation
    }

    // eslint-disable-next-line sonarjs/cognitive-complexity
    const buyHandler = async () => {
        try {
            setBuyLoading(true)
            setError("")
            if (offerAttestation && idAttestation) {
                const offerAttestationValue = prepareAttestation(offerAttestation)
                const idAttestationValue = prepareAttestation(idAttestation)

                console.log("offer--", offerAttestationValue)
                console.log("id---", idAttestationValue)

                const baseFee = await ethereum.send("eth_getBaseFeePerGas", [])
                console.log("baseFee--", baseFee)
                let feePriority = BigInt(10 * 1000_000_000)

                if (baseFee && (baseFee * BigInt(13)) / BigInt(100) >= feePriority) {
                    feePriority = (baseFee * BigInt(13)) / BigInt(100)
                }
                // // 200 GWEI
                const maxGasPrice = 200 * 1000_000_000

                let txHash

                if (erc20 === ZERO_ADDRESS) {
                    const encodeData = await ethereum.send("eth_encodeData", {
                        contract: DVP_CONTRACT_ADDRESS,
                        abi: DVP_ABI,
                        data: [offerAttestationValue, idAttestationValue],
                        function: "perform",
                    })

                    txHash = await ethereum.send("eth_sendTransaction", [
                        {
                            from: walletAddress,
                            to: DVP_CONTRACT_ADDRESS,
                            data: encodeData,
                            value: ethers.toBeHex(ethers.parseUnits(price, 18).toString()),
                            gasLimit: ethers.toBeHex(600000),
                            maxPriorityFeePerGas: ethers.toBeHex(feePriority),
                            maxFeePerGas: ethers.toBeHex(maxGasPrice),
                        },
                    ])

                    console.log(txHash)
                } else {
                    //   ts = await dvpContract.perform(offerAttestation, idAttestation, {
                    //     gasLimit: 6000000,
                    //     maxPriorityFeePerGas: feePriority,
                    //     maxFeePerGas: maxGasPrice,
                    //   })
                }

                console.log(
                    "succeess!!!!",
                    "https://mumbai.polygonscan.com/tx/" + txHash
                )
                detectTransaction(txHash)
            }
        } catch (e: any) {
            if (e.response && e.response.data) {
                setError(e.response.data.message)
            } else {
                if (e.message.indexOf("ACTION_REJECTED") > -1) {
                    setError("User rejected action")
                } else {
                    setError(e.message)
                }
            }
            setBuyLoading(false)
        }
    }

    const detectTransaction = async (txHash: string) => {
        const timer = setInterval(async () => {
            try {
                const transaction = await ethereum.send("eth_getTransactionReceipt", [
                    txHash,
                ])
                console.log(transaction)
                settxURL(`${TX_ROOT}/tx/${txHash}`)
                setBuyLoading(false)
                clearInterval(timer)
            } catch (e) {
                console.log(e)
            }
        }, 1000)
    }

    return (
        <>
            <div className="">
                <div>
                    <div>
                        Your wallet is: {walletAddress} in {chainId}
                    </div>
                    <div>
                        Your email is: {email}
                        <br />
                        Price is: {price} ETH
                    </div>
                    <div className="mx-auto my-4 w-40 text-center">
                        {!image && (
                            <>
                                <Loading className="mx-auto" />
                            </>
                        )}
                        {image && (
                            <>
                                <img src={image} id="image" alt="preview" className="mx-auto" />
                                <a
                                    href={`https://testnets.opensea.io/assets/mumbai/${token}/${tokenId}`}
                                    target="_blank"
                                    className="mx-auto mt-4 w-40 text-center underline"
                                >
                                    Details
                                </a>
                            </>
                        )}
                    </div>

                    <div className="flex justify-center">
                        <button
                            className="hover:bg-Indigo-400 ring-offset-background focus-visible:ring-ring inline-flex h-12 w-40 items-center justify-center  rounded-lg border bg-blue-400 px-4 py-2  text-lg font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                            onClick={() => verifyHandler()}
                        >
                            {verifyLoading && <SpinLoading />} {!verifyLoading && <>Verify</>}
                        </button>
                    </div>
                    <div
                        className={buyBtnHidden ? "hidden" : "mt-4 text-center"}
                        id="buyDiv"
                    >
                        Congratulation, Your have verified successfully! <br />
                        Do you wanto buy?
                        <br />
                        <div className="mt-4 flex justify-center gap-4">
                            <button
                                className="hover:bg-Indigo-400 ring-offset-background focus-visible:ring-ring inline-flex h-12 w-40  items-center justify-center rounded-lg border bg-blue-400 px-4 py-2  text-lg font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                disabled={approved || approveLoading}
                                onClick={() => approveHandler()}
                            >
                                {approveLoading && <SpinLoading />}
                                {!approveLoading && <>Approve</>}
                            </button>
                            <button
                                id="buyButton"
                                className="hover:bg-Indigo-400 ring-offset-background focus-visible:ring-ring inline-flex h-12 w-40  items-center justify-center rounded-lg border bg-blue-400 px-4 py-2  text-lg font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                                onClick={() => buyHandler()}
                                disabled={buyLoading}
                            >
                                {buyLoading && <SpinLoading />} {!buyLoading && <>Buy</>}
                            </button>
                        </div>
                    </div>
                    <div
                        className={(txURL === "" ? "hidden" : "") + " mt-4  break-words"}
                    >
                        Please visit to check the transaction:{" "}
                        <a href={txURL} className="cursor underline" target="_blank">
                            View the transaction
                        </a>
                    </div>
                    {error && <div className="mt-4 text-red-500">Error:{error}</div>}
                </div>
            </div>
            {/* <BuyerVerifyDialog ref={modalRef} /> */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="w-[500px] gap-0 rounded-3xl rounded-b-none p-4 pt-14 sm:max-w-md sm:rounded-3xl sm:p-8">
                    <iframe
                        id="attIframe"
                        src={env.NEXT_PUBLIC_ATTESTATION_FRONTEND}
                        className="h-[400px] w-[400px]"
                    ></iframe>
                </DialogContent>
            </Dialog>
        </>
    )
}
