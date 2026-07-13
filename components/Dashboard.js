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

  const [activeTab, setActiveTab] = useState("profile") // profile | gateway | analytics
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    profilepic: "",
    coverpic: "",
    razorpayid: "",
    razorpaysecret: "",
    razorpaywebhooksecret: "",
    bio: "",
    goal: 10000,
  })
  const [payments, setPayments] = useState([])
  const [hasRazorpaySecret, setHasRazorpaySecret] = useState(false)
  const [hasRazorpayWebhookSecret, setHasRazorpayWebhookSecret] = useState(false)
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
        razorpaysecret: "", // never expose secret
        razorpaywebhooksecret: "", // never expose secret
        bio: u.bio || "",
        goal: u.goal || 10000,
      })
      setPayments(u.payments || [])
      setHasRazorpaySecret(u.hasRazorpaySecret)
      setHasRazorpayWebhookSecret(u.hasRazorpayWebhookSecret)
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
      const dataToSend = { ...form }
      if (!dataToSend.razorpaysecret || dataToSend.razorpaysecret.trim() === "") {
        delete dataToSend.razorpaysecret
      }
      if (!dataToSend.razorpaywebhooksecret || dataToSend.razorpaywebhooksecret.trim() === "") {
        delete dataToSend.razorpaywebhooksecret
      }

      const res = await updateProfile(dataToSend)
      if (!res.success) {
        toast.error(res.message, { theme: "dark", transition: Bounce })
        return
      }
      await update({ name: form.username })
      setHasRazorpaySecret(hasRazorpaySecret || !!form.razorpaysecret)
      setHasRazorpayWebhookSecret(hasRazorpayWebhookSecret || !!form.razorpaywebhooksecret)
      setForm((prev) => ({ ...prev, razorpaysecret: "", razorpaywebhooksecret: "" })) // Clear secrets inputs
      toast.success("Profile updated successfully!", { theme: "dark", transition: Bounce })
    } catch {
      toast.error("An unexpected error occurred.", { theme: "dark", transition: Bounce })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Analytics Metrics
  const totalEarnings = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalSupporters = payments.length
  const averageDonation = totalSupporters > 0 ? Math.round(totalEarnings / totalSupporters) : 0

  // Export received payments to CSV file for accounting
  const exportToCSV = () => {
    if (payments.length === 0) return
    
    const headers = ["Supporter Name", "Amount (INR)", "Date", "Message", "Razorpay Order ID"]
    const rows = payments.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      p.amount,
      new Date(p.createdAt || Date.now()).toLocaleDateString("en-IN"),
      `"${(p.message || "").replace(/"/g, '""')}"`,
      p.oid
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `earnings_report_${form.username || "creator"}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Transaction report exported successfully!", { theme: "dark", transition: Bounce })
  }

  // Calculate daily earnings trend for the last 7 days
  const getChartData = () => {
    const chartDays = []
    const earningsByDay = {}

    // Initialize the last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      chartDays.push(dateStr)
      earningsByDay[dateStr] = 0
    }

    // Populate daily earnings sum from completed payments
    payments.forEach((p) => {
      const pDate = new Date(p.createdAt || Date.now())
      const dateStr = pDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
      if (earningsByDay[dateStr] !== undefined) {
        earningsByDay[dateStr] += Number(p.amount)
      }
    })

    return chartDays.map((day) => ({
      day,
      amount: earningsByDay[day]
    }))
  }

  const chartData = getChartData()

  return (
    <div className="bg-[#030712] min-h-[calc(100vh-130px)] text-white py-12 px-4 md:px-8">
      <ToastContainer position="top-right" autoClose={5000} theme="dark" transition={Bounce} />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Your Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">Manage configurations, integrations, and earnings analytics</p>
          </div>
          {form.username && (
            <a
              href={`/${form.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold tracking-wide text-slate-300 hover:text-white transition active:scale-[0.98]"
            >
              View Public Profile ↗
            </a>
          )}
        </div>

        {/* Tab Headers */}
        <div className="flex gap-6 md:gap-8 overflow-x-auto whitespace-nowrap scrollbar-none border-b border-white/5 pb-px mb-8">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "profile"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Profile Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("gateway")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "gateway"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Payment Gateway
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "border-indigo-500 text-white"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            Earnings & Analytics
          </button>
        </div>

        {/* Tab Contents */}
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* TAB 1: PROFILE SETTINGS */}
          {activeTab === "profile" && (
            <div className="space-y-8">
              
              {/* Profile Details */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest pb-3 border-b border-white/5">Account Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Display Name</label>
                    <input
                      value={form.name || ""}
                      onChange={handleChange}
                      type="text"
                      name="name"
                      placeholder="Display Name"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Username</label>
                    <input
                      value={form.username || ""}
                      onChange={handleChange}
                      type="text"
                      name="username"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                    />
                    <p className="text-[10px] text-slate-500">
                      Letters, numbers, and underscores only. Changing this updates your profile URL.
                    </p>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bio / Description</label>
                    <textarea
                      value={form.bio || ""}
                      onChange={handleChange}
                      name="bio"
                      rows="3"
                      placeholder="Tell supporters about yourself..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm resize-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Funding Target Goal (₹)</label>
                    <input
                      value={form.goal || 10000}
                      onChange={handleChange}
                      type="number"
                      name="goal"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      value={form.email || ""}
                      type="email"
                      disabled
                      className="w-full px-4 py-3 bg-white/[0.01] border border-white/5 text-slate-500 rounded-xl cursor-not-allowed text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Branding Details */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest pb-3 border-b border-white/5">Assets & Styling</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Profile Picture URL</label>
                      <input
                        value={form.profilepic || ""}
                        onChange={handleChange}
                        type="text"
                        name="profilepic"
                        placeholder="Image URL"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="flex justify-center md:justify-start">
                      <img
                        src={form.profilepic || "https://dummyimage.com/100x100/e2e8f0/64748b&text=Profile"}
                        alt="Profile Preview"
                        className="h-20 w-20 rounded-2xl object-cover border border-white/10 shadow-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cover Banner URL</label>
                      <input
                        value={form.coverpic || ""}
                        onChange={handleChange}
                        type="text"
                        name="coverpic"
                        placeholder="Image URL"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                      />
                    </div>
                    <img
                      src={form.coverpic || "https://dummyimage.com/800x200/e2e8f0/64748b&text=Cover+Image"}
                      alt="Cover Preview"
                      className="w-full h-20 rounded-xl object-cover border border-white/10 shadow-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Profile Settings */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? "Saving changes..." : "Save Settings"}
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: PAYMENT CONFIG */}
          {activeTab === "gateway" && (
            <div className="space-y-6">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest pb-3 border-b border-white/5">Razorpay Credentials</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Razorpay Key ID</label>
                    <input
                      value={form.razorpayid || ""}
                      onChange={handleChange}
                      type="text"
                      name="razorpayid"
                      placeholder="rzp_test_xxxxxx or rzp_live_xxxxxx"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                    />
                    <p className="text-[10px] text-slate-500">
                      Your Razorpay API public key. Starts with rzp_
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Razorpay Key Secret</label>
                    <input
                      value={form.razorpaysecret}
                      onChange={handleChange}
                      type="password"
                      name="razorpaysecret"
                      placeholder={hasRazorpaySecret ? "••••••••  (secret configured)" : "Enter your secret key"}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                    />
                    <p className="text-[10px] text-slate-500">
                      {hasRazorpaySecret
                        ? "✅ Key configured. Type a new secret key to overwrite, or leave empty to keep current."
                        : "Key secret will be encrypted before database storage."
                      }
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-1.5 pt-4 border-t border-white/5">
                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Razorpay Webhook Secret</label>
                    <input
                      value={form.razorpaywebhooksecret}
                      onChange={handleChange}
                      type="password"
                      name="razorpaywebhooksecret"
                      placeholder={hasRazorpayWebhookSecret ? "••••••••  (webhook secret configured)" : "Enter your webhook secret key"}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
                    />
                    <p className="text-[10px] text-slate-500">
                      {hasRazorpayWebhookSecret
                        ? "✅ Webhook Secret configured. Type a new secret to overwrite, or leave empty to keep current."
                        : "Symmetric key used to verify webhook notifications from Razorpay."
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Webhook Setup Instructions Card */}
              <div className="bg-indigo-950/10 border border-indigo-500/10 rounded-2xl p-6 space-y-4">
                <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Webhook Integration Setup</h3>
                <div className="text-xs text-slate-400 space-y-2">
                  <p>To enable real-time, server-side transaction updates (even if a supporter closes their browser midway):</p>
                  <ol className="list-decimal list-inside space-y-1 pl-1">
                    <li>Log in to your <strong>Razorpay Dashboard</strong>.</li>
                    <li>Go to <strong>Settings</strong> &gt; <strong>Webhooks</strong> &gt; <strong>Add New Webhook</strong>.</li>
                    <li>Set the Webhook URL to: <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300 select-all">{typeof window !== 'undefined' ? `${window.location.origin}/api/webhook` : 'https://<your-domain>/api/webhook'}</code></li>
                    <li>Define a secret key of your choice, enter it in the Razorpay Webhooks settings, and paste the exact same secret in the <strong>Razorpay Webhook Secret</strong> field above.</li>
                    <li>Select the Active Event: <code className="bg-white/5 px-1.5 py-0.5 rounded text-indigo-300">payment.captured</code></li>
                    <li>Click <strong>Save Webhook</strong> and save your dashboard configuration above.</li>
                  </ol>
                </div>
              </div>

              {/* Submit Gateway Settings */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50"
                >
                  {isSubmitting ? "Saving gateway configurations..." : "Save API Credentials"}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: EARNINGS & ANALYTICS */}
          {activeTab === "analytics" && (
            <div className="space-y-8">
              
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Earnings</span>
                  <p className="text-3xl font-extrabold text-white mt-2">₹{totalEarnings.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total Supporters</span>
                  <p className="text-3xl font-extrabold text-white mt-2">{totalSupporters}</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Average Support</span>
                  <p className="text-3xl font-extrabold text-white mt-2">₹{averageDonation.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Pure SVG Line Chart (7 Days Earnings Trend) */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">7-Day Earnings Trend</h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Daily completed support payouts (INR)</p>
                </div>
                
                <div className="w-full overflow-hidden">
                  {/* Inline pure SVG chart */}
                  {(() => {
                    const maxVal = Math.max(...chartData.map(d => d.amount), 100);
                    // Map points to X (40 to 460) and Y (40 to 150)
                    const points = chartData.map((d, i) => {
                      const x = 50 + i * 68;
                      const y = 150 - (d.amount / maxVal) * 110;
                      return { x, y, amount: d.amount, day: d.day };
                    });
                    
                    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");
                    
                    return (
                      <svg viewBox="0 0 500 200" className="w-full h-auto text-indigo-500" fill="none">
                        {/* Horizontal gridlines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
                          const y = 150 - ratio * 110;
                          const gridVal = Math.round(ratio * maxVal);
                          return (
                            <g key={index} className="opacity-20">
                              <line x1="50" y1={y} x2="460" y2={y} stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                              <text x="15" y={y + 4} fill="currentColor" className="text-[9px] font-semibold text-slate-500" textAnchor="start">
                                ₹{gridVal}
                              </text>
                            </g>
                          );
                        })}

                        {/* Chart Line */}
                        <path d={linePath} stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-90" />
                        
                        {/* Interactive dots & value tags */}
                        {points.map((p, i) => (
                          <g key={i} className="group cursor-pointer">
                            <circle cx={p.x} cy={p.y} r="5" className="fill-[#030712] stroke-indigo-400" strokeWidth="2.5" />
                            {p.amount > 0 && (
                              <text x={p.x} y={p.y - 12} fill="#fff" className="text-[9px] font-bold text-center" textAnchor="middle">
                                ₹{p.amount}
                              </text>
                            )}
                            <text x={p.x} y="175" fill="#64748b" className="text-[9px] font-semibold" textAnchor="middle">
                              {p.day}
                            </text>
                          </g>
                        ))}
                        
                        {/* X Axis line */}
                        <line x1="50" y1="155" x2="460" y2="155" stroke="#ffffff" strokeWidth="1" className="opacity-10" />
                      </svg>
                    );
                  })()}
                </div>
              </div>

              {/* Payments Transaction List Table */}
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 shadow-xl overflow-hidden">
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Payment History Log</h3>
                  {payments.length > 0 && (
                    <button
                      type="button"
                      onClick={exportToCSV}
                      className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition active:scale-[0.98] cursor-pointer"
                    >
                      Export CSV 📥
                    </button>
                  )}
                </div>
                
                {payments.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-slate-500 text-sm">No donations received yet. Share your profile link to get supported!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-white/5 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                          <th className="pb-3 pr-4">Supporter</th>
                          <th className="pb-3 px-4">Amount</th>
                          <th className="pb-3 px-4">Date</th>
                          <th className="pb-3 px-4">Message</th>
                          <th className="pb-3 pl-4 text-right">Order ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-300">
                        {payments.map((p) => (
                          <tr key={p._id} className="hover:bg-white/[0.01]">
                            <td className="py-3.5 pr-4 font-semibold text-white">{p.name}</td>
                            <td className="py-3.5 px-4 text-indigo-400 font-bold">₹{p.amount}</td>
                            <td className="py-3.5 px-4 text-xs text-slate-500">
                              {new Date(p.createdAt || Date.now()).toLocaleDateString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-3.5 px-4 max-w-[200px] truncate text-slate-400" title={p.message}>
                              {p.message || "-"}
                            </td>
                            <td className="py-3.5 pl-4 text-right text-xs font-mono text-slate-500">
                              {p.oid}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

        </form>
      </div>
    </div>
  )
}

export default Dashboard
