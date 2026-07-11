"use client"
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { useState, useRef } from 'react'

const Navbar = () => {
    const { data: session } = useSession()
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const dropdownRef = useRef(null)

    return (
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-[#030712]/75 border-b border-white/5 px-6 py-3.5 flex items-center justify-between gap-4">
            <Link href="/" className="font-bold flex items-center gap-2 hover:opacity-90 transition-opacity">
                <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                    <Image src="/tea.gif" className="invert brightness-200" alt="Tea logo" width={22} height={22} />
                </div>
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    GetMeAChai
                </span>
            </Link>

            <div className="flex items-center gap-3">
                {session ? (
                    <>
                        {/* Dropdown Menu */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 px-4 py-2 rounded-xl text-white font-medium text-sm transition active:scale-[0.98]"
                            >
                                Welcome, {session.user.name || session.user.email.split("@")[0]}
                                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            <div
                                className={`absolute right-0 mt-2 w-48 bg-slate-950 border border-white/10 text-white rounded-xl shadow-xl z-20 backdrop-blur-xl ${dropdownOpen ? 'block' : 'hidden'}`}
                            >
                                <ul className="py-1.5 p-1">
                                    <li>
                                        <Link
                                            href="/dashboard"
                                            className="block px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            Dashboard
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={`/${session?.user?.name}`}
                                            className="block px-4 py-2 hover:bg-white/5 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                                            onClick={() => setDropdownOpen(false)}
                                        >
                                            My Profile
                                        </Link>
                                    </li>
                                    <div className="h-px bg-white/5 my-1"></div>
                                    <li>
                                        <button
                                            onClick={() => {
                                                setDropdownOpen(false)
                                                signOut({ callbackUrl: "/login" })
                                            }}
                                            className="w-full text-left px-4 py-2 hover:bg-red-500/10 rounded-lg text-sm text-red-400 hover:text-red-300 transition-colors"
                                        >
                                            Sign out
                                        </button>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </>
                ) : (
                    <Link href="/login">
                        <button className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/10 transition active:scale-[0.98]">
                            Sign In
                        </button>
                    </Link>
                )}
            </div>
        </nav>
    )
}

export default Navbar