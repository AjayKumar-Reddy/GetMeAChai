"use client"
import React, { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { updateProfile, fetchUserDashboard } from "@/actions/useractions"
import { ToastContainer, toast, Bounce } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"

const Dashboard = () => {
  const { data: session, update } = useSession()
  const router = useRouter()

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    profilepic: "",
    coverpic: "",
    razorpayid: "",
    razorpaysecret: "",
  })
  const [hasRazorpaySecret, setHasRazorpaySecret] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!session) {
      router.push("/login")
    } else {
      getData()
    }
  }, [session, router])

  const getData = async () => {
    const u = await fetchUserDashboard()
    if (u) {
      setForm({
        name: u.name || "",
        email: u.email || "",
        username: u.username || "",
        profilepic: u.profilepic || "",
        coverpic: u.coverpic || "",
        razorpayid: u.razorpayid || "",
        razorpaysecret: "", // Never show actual secret — user types new if they want to update
      })
      setHasRazorpaySecret(u.hasRazorpaySecret)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      // Only send razorpaysecret if user typed a new one
      const dataToSend = { ...form }
      if (!dataToSend.razorpaysecret || dataToSend.razorpaysecret.trim() === "") {
        delete dataToSend.razorpaysecret
      }

      // updateProfile no longer needs oldusername — server gets it from session
      const res = await updateProfile(dataToSend)
      if (!res.success) {
        toast.error(res.message, { theme: "light", transition: Bounce })
        return
      }
      await update({ name: form.username })
      setHasRazorpaySecret(hasRazorpaySecret || !!form.razorpaysecret)
      setForm((prev) => ({ ...prev, razorpaysecret: "" })) // Clear after save
      toast.success("Profile updated successfully!", { theme: "light", transition: Bounce })
    } catch {
      toast.error("An unexpected error occurred.", { theme: "light", transition: Bounce })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} theme="dark" transition={Bounce} />

      <div className="min-h-[calc(100vh-130px)] bg-transparent py-12 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">Your Dashboard</h1>
            <p className="text-slate-400 mt-2 text-sm">Update your profile and account settings</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Profile Details */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold border-b border-white/5 pb-3 mb-6 text-white">Profile Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Name</label>
                  <input
                    value={form.name || ""}
                    onChange={handleChange}
                    type="text"
                    name="name"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Username</label>
                  <input
                    value={form.username || ""}
                    onChange={handleChange}
                    type="text"
                    name="username"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Letters, numbers, and underscores only
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Email</label>
                  <input
                    value={form.email || ""}
                    type="email"
                    name="email"
                    disabled
                    className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 text-slate-500 rounded-xl cursor-not-allowed text-sm"
                  />
                  <p className="text-xs text-slate-600 mt-1.5">
                    Email cannot be changed (linked to your GitHub account)
                  </p>
                </div>
              </div>
            </div>

            {/* Branding */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold border-b border-white/5 pb-3 mb-6 text-white">Branding</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Profile Picture URL</label>
                  <input
                    value={form.profilepic || ""}
                    onChange={handleChange}
                    type="text"
                    name="profilepic"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                  />
                  <div className="mt-4 flex justify-center">
                    <img
                      src={form.profilepic || "https://dummyimage.com/100x100/e2e8f0/64748b&text=Profile"}
                      alt="Profile Preview"
                      className="h-24 w-24 rounded-full object-cover border border-white/10 shadow-md"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Cover Picture URL</label>
                  <input
                    value={form.coverpic || ""}
                    onChange={handleChange}
                    type="text"
                    name="coverpic"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                  />
                  <div className="mt-4">
                    <img
                      src={form.coverpic || "https://dummyimage.com/800x200/e2e8f0/64748b&text=Cover+Image"}
                      alt="Cover Preview"
                      className="w-full h-32 rounded-xl object-cover border border-white/10 shadow-md"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Gateway */}
            <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-bold border-b border-white/5 pb-3 mb-6 text-white">Payment Gateway</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Razorpay Key ID</label>
                  <input
                    value={form.razorpayid || ""}
                    onChange={handleChange}
                    type="text"
                    name="razorpayid"
                    placeholder="rzp_test_xxxxx or rzp_live_xxxxx"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Your Razorpay public key (starts with rzp_)
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Razorpay Key Secret</label>
                  <input
                    value={form.razorpaysecret}
                    onChange={handleChange}
                    type="password"
                    name="razorpaysecret"
                    placeholder={hasRazorpaySecret ? "••••••••  (secret is configured)" : "Enter your Razorpay secret key"}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    {hasRazorpaySecret
                      ? "✅ Secret is encrypted and stored. Leave blank to keep current secret."
                      : "Your secret will be encrypted before storage (AES-256-GCM)."
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.37 0 0 5.37 0 12h4z"></path>
                    </svg>
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

export default Dashboard
