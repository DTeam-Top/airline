"use client"
import { SellerSection } from "@/components/attestation/seller-section"
import { ConnectWalletButton } from "@/components/connect-wallet-button"
import { SiteHeaderAttestation } from "@/components/site-header-attestation"
import { useAccount } from "wagmi"

export default function SellerPage() {

    const { address } = useAccount()
    return (
        <>
            <div className="relative flex min-h-screen flex-col">
                <div className="flex-1">
                    <SiteHeaderAttestation />
                    {address ? (<SellerSection />) : (
                        <section className="bg-white py-10 md:px-4">
                            <div className="container flex h-[500px]  w-4/5  flex-col  items-center rounded border py-9 text-center shadow-lg ">
                                <div className="border-red mt-40 border"> <ConnectWalletButton /></div>

                            </div></section>)}

                </div>
            </div>
        </>
    )
}
