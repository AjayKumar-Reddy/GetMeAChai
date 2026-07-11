"use client"
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { fetchAllUser } from "@/actions/useractions";

const Home = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        const value = e.target.value;
        setQuery(value);

        if (value.length > 1) {
            setLoading(true);
            try {
                const res = await fetchAllUser();
                const filtered = res.filter((user) =>
                    user.username.toLowerCase().includes(value.toLowerCase()) ||
                    (user.name && user.name.toLowerCase().includes(value.toLowerCase()))
                );
                setResults(filtered);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        } else {
            setResults([]);
        }
    };

    return (
        <div className="min-h-[calc(100vh-130px)] bg-transparent flex flex-col justify-center items-center px-6 py-12">
            {/* Main Content */}
            <div className="max-w-4xl w-full text-center space-y-12">
                {/* Logo + Title */}
                <div className="flex flex-col items-center justify-center gap-6">
                    <div className="flex items-center gap-4 flex-wrap justify-center">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent">
                            GetMeAChai
                        </h1>
                        <div className="relative w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                            <Image
                                src="/tea.gif"
                                alt="Chai"
                                width={28}
                                height={28}
                                className="invert brightness-200"
                            />
                        </div>
                    </div>

                    <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        A clean, robust <span className="text-indigo-400 font-semibold">crowdfunding network</span> for creators.  
                        Get funded directly by your <span className="text-white font-semibold">fans and supporters</span>.
                    </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full max-w-2xl mx-auto">
                    <div className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={handleSearch}
                            placeholder="Search for creators..."
                            className="w-full px-5 py-4 pl-12 text-white bg-white/5 border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 focus:outline-none transition-all text-lg"
                        />
                        <svg
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5.5 h-5.5 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>

                    {/* Loading Indicator */}
                    {loading && (
                        <div className="mt-3 flex items-center gap-2 text-indigo-400 text-sm">
                            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                            <span>Searching...</span>
                        </div>
                    )}

                    {/* Search Results */}
                    {results.length > 0 && (
                        <div className="absolute z-10 mt-2 w-full bg-slate-950 border border-white/10 text-white rounded-xl shadow-xl backdrop-blur-xl max-h-80 overflow-y-auto p-1">
                            {results.map((user) => (
                                <Link
                                    key={user._id}
                                    href={`/${user.username}`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-lg transition-colors"
                                    onClick={() => setQuery("")}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-semibold shadow-sm">
                                        {(user.name || user.username).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="text-left">
                                        <div className="font-semibold text-white">
                                            {user.name || user.username}
                                        </div>
                                        {user.name && user.username && (
                                            <div className="text-xs text-slate-400">@{user.username}</div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                            <div className="px-4 py-2 text-center text-xs text-slate-500 border-t border-white/5 mt-1">
                                {results.length} creator{results.length !== 1 ? 's' : ''} found
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/login">
                        <button className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98]">
                            Get Started
                        </button>
                    </Link>
                    <Link href="/about">
                        <button className="w-full sm:w-auto px-8 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all active:scale-[0.98]">
                            Learn More
                        </button>
                    </Link>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap justify-center gap-8 mt-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                        <span>Secure Transactions</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                        <span>Direct Payouts</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                        <span>Developer Friendly</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;