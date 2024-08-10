/* eslint-disable sonarjs/no-duplicate-string */
"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Dialog } from "@headlessui/react"

import { cn } from "@/lib/utils"
import {
    ConnectWalletButton,
    MobileConnectWalletButton,
} from "@/components/connect-wallet-button"
import { HeaderHamburger } from "@/components/header-hamburger"
import { CloseHamburger, Hamburger } from "@/components/icons/hamburger"

interface Props {
    menuTheme?: "dark" | "light"
    dialogClassName?: string
    dialogTheme?: "dark" | "light"
}

export function SiteHeaderAttestation({
    menuTheme: theme = "dark",
    dialogTheme = "light",
    ...props
}: Props) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const pathname = usePathname()
    const isMenuLightTheme = theme === "light"

    return (
        <header className={cn("w-full", { "bg-white": isMenuLightTheme })}>
            <nav
                className="container flex h-[66px] items-center justify-between space-x-4 lg:h-[136px]"
                aria-label="Global"
            >
                <HeaderLogo type={isMenuLightTheme ? "black" : "white"} />
                <div>
                    <HeaderHamburger
                        onClick={() => setMobileMenuOpen(true)}
                        hamburgerClassName={isMenuLightTheme ? "text-black" : "text-white"}
                    />
                    <div className="hidden shrink-0 lg:flex">
                        <ConnectWalletButton className="h-9 bg-[#2B2E36] px-4 text-white opacity-80 hover:bg-[#595E6A]" />
                    </div>
                </div>
            </nav>
            <Dialog
                as="div"
                className="lg:hidden"
                open={mobileMenuOpen}
                onClose={setMobileMenuOpen}
            >
                <div className="fixed inset-0 z-50" />
                <Dialog.Panel
                    className={cn(
                        "fixed inset-0 z-50 w-full overflow-y-auto bg-white sm:ring-1 sm:ring-gray-900/10",
                        props.dialogClassName
                    )}
                >
                    <div className="container flex min-h-screen flex-col justify-between">
                        <div>
                            <div className="flex h-[66px] items-center justify-between">
                                <HeaderLogo type={dialogTheme === "dark" ? "white" : "black"} />
                                <button
                                    type="button"
                                    className="-m-2.5 rounded-md p-2.5 text-gray-700"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <span className="sr-only">Close menu</span>
                                    {mobileMenuOpen ? (
                                        <div
                                            className={
                                                dialogTheme === "dark" ? "text-white" : "text-gray-700"
                                            }
                                        >
                                            <CloseHamburger className="h-6 w-6" aria-hidden="true" />
                                        </div>
                                    ) : (
                                        <div
                                            className={isMenuLightTheme ? "text-black" : "text-white"}
                                        >
                                            <Hamburger className="h-6 w-6" aria-hidden="true" />
                                        </div>
                                    )}
                                </button>
                            </div>
                            <div className="flow-root">
                                <div className="">
                                    <MobileConnectWalletButton />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col pb-24">

                        </div>
                    </div>
                </Dialog.Panel>
            </Dialog>
        </header>
    )
}

const HeaderLogo = ({ type }: { type: "white" | "black" }) => {
    return (
        <Link href="/" className="flex  items-center text-4xl font-bold uppercase text-white" aria-label="Home">
            <img src="/icon.png" className="mr-4 h-[48px] w-[48px]" /> Airline
        </Link>
    )
}

function isActive(href: string, pathname: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href)
}
