import { SellerSection } from "@/components/attestation/seller-section"
import { SiteHeaderAttestation } from "@/components/site-header-attestation"

export default function SellerPage() {
    return (
        <>
            <div className="relative flex min-h-screen flex-col">
                <div className="flex-1">
                    <SiteHeaderAttestation />
                    <SellerSection />
                </div>
            </div>
        </>
    )
}
