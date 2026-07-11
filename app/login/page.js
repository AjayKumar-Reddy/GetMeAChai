"use client"
import React, { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { registerUser } from "@/actions/useractions"
import { ToastContainer, toast, Bounce } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import Image from "next/image"

const Login = () => {
    const { data: session } = useSession()
    const router = useRouter()
    
    const [isLoginTab, setIsLoginTab] = useState(true)
    const [isLoading, setIsLoading] = useState(false)

    // Form states
    const [loginForm, setLoginForm] = useState({ email: "", password: "" })
    const [signupForm, setSignupForm] = useState({ username: "", email: "", name: "", password: "" })

    useEffect(() => {
        document.title = "Authentication - GetMeAChai!"
        if (session) {
            router.push("/dashboard")
        }
    }, [session, router])

    const handleLoginChange = (e) => {
        setLoginForm({ ...loginForm, [e.target.name]: e.target.value })
    }

    const handleSignupChange = (e) => {
        setSignupForm({ ...signupForm, [e.target.name]: e.target.value })
    }

    const handleCredentialsLogin = async (e) => {
        e.preventDefault()
        if (!loginForm.email || !loginForm.password) {
            toast.error("Please enter both email/username and password", { theme: "dark", transition: Bounce })
            return
        }

        setIsLoading(true)
        try {
            // signIn credentials returns a response object instead of throwing
            const res = await signIn("credentials", {
                email: loginForm.email,
                password: loginForm.password,
                redirect: false,
            })

            if (res?.error) {
                toast.error(res.error, { theme: "dark", transition: Bounce })
            } else {
                toast.success("Welcome back! Redirecting...", { theme: "dark", transition: Bounce })
                router.push("/dashboard")
            }
        } catch (err) {
            toast.error("An unexpected error occurred during login", { theme: "dark", transition: Bounce })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSignup = async (e) => {
        e.preventDefault()
        if (!signupForm.username || !signupForm.email || !signupForm.password) {
            toast.error("Please fill in all required fields", { theme: "dark", transition: Bounce })
            return
        }

        setIsLoading(true)
        try {
            const res = await registerUser(signupForm)
            if (res.success) {
                toast.success("Registration successful! You can now log in.", { theme: "dark", transition: Bounce })
                setIsLoginTab(true) // switch to login tab
                setLoginForm({ email: signupForm.email, password: "" }) // prefill email
            } else {
                toast.error(res.message, { theme: "dark", transition: Bounce })
            }
        } catch (err) {
            toast.error("An unexpected error occurred during signup", { theme: "dark", transition: Bounce })
        } finally {
            setIsLoading(false)
        }
    }

    const handleGithubLogin = () => {
        setIsLoading(true)
        signIn("github")
    }

    return (
        <div className="min-h-[calc(100vh-130px)] flex bg-[#030712] text-white">
            <ToastContainer position="top-right" autoClose={4000} theme="dark" transition={Bounce} />

            {/* Left side: Premium Brand Panel (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950 relative overflow-hidden flex-col justify-center p-16 border-r border-white/5">
                {/* Background ambient lighting */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none"></div>

                {/* Main Brand Messaging */}
                <div className="relative z-10 max-w-md space-y-6">
                    <h2 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-white">
                        Empower your creative journey.
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed">
                        A clean, transparent, and robust payment network for creators. Build your supporter base and receive funds without the friction.
                    </p>
                    
                    {/* Minimalist Trust Badges */}
                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                        <div>
                            <div className="text-2xl font-bold text-white">100%</div>
                            <div className="text-sm text-gray-500 mt-1">Direct payout control</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">AES-256</div>
                            <div className="text-sm text-gray-500 mt-1">Encrypted API credentials</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right side: Authentication Card */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
                {/* Background lighting on mobile */}
                <div className="lg:hidden absolute top-10 right-10 w-[200px] h-[200px] bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none"></div>

                <div className="w-full max-w-[420px] space-y-8">
                    {/* Header */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-white">
                            {isLoginTab ? "Welcome back" : "Create your account"}
                        </h1>
                        <p className="text-gray-400 text-sm">
                            {isLoginTab 
                                ? "Sign in to manage your creator profile and donations" 
                                : "Start receiving support from your followers today"
                            }
                        </p>
                    </div>

                    {/* Tab Selection */}
                    <div className="flex border-b border-white/10 pb-px">
                        <button
                            onClick={() => { setIsLoginTab(true); setIsLoading(false); }}
                            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                                isLoginTab 
                                    ? "border-indigo-500 text-white" 
                                    : "border-transparent text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => { setIsLoginTab(false); setIsLoading(false); }}
                            className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-all ${
                                !isLoginTab 
                                    ? "border-indigo-500 text-white" 
                                    : "border-transparent text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            Register
                        </button>
                    </div>

                    {/* OAuth Button (GitHub) */}
                    <div className="space-y-4">
                        <button
                            onClick={handleGithubLogin}
                            type="button"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 rounded-xl font-medium text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 .333A9.911 9.911 0 0 0 6.866 19.65c.5.092.678-.215.678-.477 0-.237-.01-1.017-.014-1.845-2.757.6-3.338-1.169-3.338-1.169a2.627 2.627 0 0 0-1.1-1.451c-.9-.615.07-.6.07-.6a2.084 2.084 0 0 1 1.518 1.021 2.11 2.11 0 0 0 2.884.823c.044-.503.268-.973.63-1.325-2.2-.25-4.516-1.1-4.516-4.9A3.832 3.832 0 0 1 4.7 7.068a3.56 3.56 0 0 1 .095-2.623s.832-.266 2.726 1.016a9.409 9.409 0 0 1 4.962 0c1.89-1.282 2.717-1.016 2.717-1.016.366.83.402 1.768.1 2.623a3.827 3.827 0 0 1 1.02 2.659c0 3.807-2.319 4.644-4.525 4.889a2.366 2.366 0 0 1 .673 1.834c0 1.326-.012 2.394-.012 2.72 0 .263.18.572.681.475A9.911 9.911 0 0 0 10 .333Z" clipRule="evenodd" />
                            </svg>
                            Continue with GitHub
                        </button>

                        <div className="flex items-center gap-4">
                            <div className="h-px flex-1 bg-white/5"></div>
                            <span className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Or continue with email</span>
                            <div className="h-px flex-1 bg-white/5"></div>
                        </div>
                    </div>

                    {/* Forms */}
                    {isLoginTab ? (
                        /* Login Form */
                        <form onSubmit={handleCredentialsLogin} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email or Username</label>
                                <input
                                    onChange={handleLoginChange}
                                    value={loginForm.email}
                                    name="email"
                                    type="text"
                                    placeholder="Enter your email or username"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password</label>
                                </div>
                                <input
                                    onChange={handleLoginChange}
                                    value={loginForm.password}
                                    name="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Signing In...
                                    </>
                                ) : (
                                    "Sign In"
                                )}
                            </button>
                        </form>
                    ) : (
                        /* Signup Form */
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Username *</label>
                                    <input
                                        onChange={handleSignupChange}
                                        value={signupForm.username}
                                        name="username"
                                        type="text"
                                        placeholder="username"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Display Name</label>
                                    <input
                                        onChange={handleSignupChange}
                                        value={signupForm.name}
                                        name="name"
                                        type="text"
                                        placeholder="John Doe"
                                        className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Email Address *</label>
                                <input
                                    onChange={handleSignupChange}
                                    value={signupForm.email}
                                    name="email"
                                    type="email"
                                    placeholder="john@example.com"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Password * (Min 6 chars)</label>
                                <input
                                    onChange={handleSignupChange}
                                    value={signupForm.password}
                                    name="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-gray-600 focus:outline-none transition-all text-sm"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Creating Account...
                                    </>
                                ) : (
                                    "Create Account"
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Login
