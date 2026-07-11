"use client"
import React, { useState, useEffect } from "react"
import Image from "next/image"
import Script from "next/script"
import { useSession } from "next-auth/react"
import { ToastContainer, toast, Bounce } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import { initiate, fetchUser, fetchPayments } from "@/actions/useractions"

const PaymentPage = ({ username }) => {
  const [paymentform, setPaymentform] = useState({ name: "", description: "", amount: "" })
  const [currentUser, setcurrentUser] = useState({})
  const [payments, setPayments] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const { data: session } = useSession()

  useEffect(() => {
    getData()
  }, [])

  const getData = async () => {
    const u = await fetchUser(username)
    setcurrentUser(u || {})
    const dbpayments = await fetchPayments(username)
    setPayments(dbpayments || [])
  }

  function handleChange(e) {
    setPaymentform({ ...paymentform, [e.target.name]: e.target.value })
  }

  const pay = async (amount) => {
    // ── Input validation ──
    if (!paymentform.name || paymentform.name.trim().length < 2) {
      toast.error("Please enter your name (at least 2 characters)", { theme: "dark", transition: Bounce })
      return
    }
    if (!paymentform.description || paymentform.description.trim().length < 3) {
      toast.error("Please enter a message (at least 3 characters)", { theme: "dark", transition: Bounce })
      return
    }
    const amtNum = Number(amount)
    if (isNaN(amtNum) || amtNum <= 0) {
      toast.error("Amount should be greater than zero", { theme: "dark", transition: Bounce })
      return
    }

    // Prevent self-payment
    if (session?.user?.name === username) {
      toast.error("You cannot donate to yourself", { theme: "dark", transition: Bounce })
      return
    }

    setIsProcessing(true)

    try {
      let order = await initiate(amount, username, paymentform)

      if (!order || !order.id) {
        toast.error("Failed to create order. Please try again.", { theme: "dark", transition: Bounce })
        setIsProcessing(false)
        return
      }

      const options = {
        key: currentUser.razorpayid,
        amount: order.amount,
        currency: order.currency,
        name: "GetMeAChai",
        description: `Supporting @${username}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            const res = await fetch("/api/razorpay", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            })
            const data = await res.json()

            if (data.success) {
              toast.success("✅ Payment successful! Thank you for supporting!", {
                theme: "dark",
                transition: Bounce,
              })
              setPaymentform({ name: "", description: "", amount: "" })
              await getData() // Refresh statistics and supporters feed
            } else {
              toast.error(`Verification failed: ${data.message}`, {
                theme: "dark",
                transition: Bounce,
              })
            }
          } catch (err) {
            console.error("Payment verification error:", err)
            toast.error("Payment verification error. Please contact support.", {
              theme: "dark",
              transition: Bounce,
            })
          } finally {
            setIsProcessing(false)
          }
        },
        prefill: {
          name: paymentform.name,
          email: session?.user?.email || "",
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: function () {
            setIsProcessing(false)
          },
        },
      }

      const rzp1 = new Razorpay(options)
      rzp1.on("payment.failed", function (response) {
        toast.error(`Payment failed: ${response.error.description}`, {
          theme: "dark",
          transition: Bounce,
        })
        setIsProcessing(false)
      })
      rzp1.open()
    } catch (err) {
      toast.error(err.message || "Something went wrong", { theme: "dark", transition: Bounce })
      setIsProcessing(false)
    }
  }

  const isSelfProfile = session?.user?.name === username
  const isFormValid = paymentform.name.trim().length >= 2 && paymentform.description.trim().length >= 3

  // Math metrics
  const totalRaised = payments.reduce((total, p) => total + Number(p.amount), 0)
  const targetGoal = currentUser.goal || 10000
  const progressPercent = Math.min(Math.round((totalRaised / targetGoal) * 100), 100)

  return (
    <div className="bg-[#030712] min-h-[calc(100vh-130px)] text-white">
      <ToastContainer position="top-right" autoClose={5000} theme="dark" transition={Bounce} />
      <Script src="https://checkout.razorpay.com/v1/checkout.js"></Script>

      {/* Profile Header (Banner & Avatar) */}
      <div className="relative w-full h-56 md:h-64 bg-slate-950 border-b border-white/5 overflow-hidden">
        {currentUser?.coverpic ? (
          <Image src={currentUser.coverpic} alt="Cover image" fill className="object-cover opacity-60" priority />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 opacity-40"></div>
        )}
        
        {/* Subtle Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030712] to-transparent"></div>

        {/* Floating Avatar */}
        <div className="absolute -bottom-12 left-6 md:left-12 flex items-end gap-5">
          <div className="w-24 h-24 md:w-28 md:h-28 relative rounded-2xl overflow-hidden border-4 border-[#030712] bg-slate-900 shadow-2xl">
            <Image
              src={currentUser?.profilepic || "/avatar.gif"}
              alt="User profile"
              fill
              className="object-cover"
            />
          </div>
          <div className="mb-14 pb-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {currentUser.name || username}
              {currentUser?.razorpayid && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  Verified
                </span>
              )}
            </h1>
            <p className="text-xs md:text-sm text-slate-400">@{username}</p>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Profile info, goal, and supporters timeline (60% / 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Bio Card */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">About Creator</h2>
              <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                {currentUser?.bio || `Hey there! I am creating awesome content and projects. If you like my work, feel free to support my journey by buying me a chai! ☕`}
              </p>
            </div>

            {/* Goal Progress Widget */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Fundraising Goal</h3>
                  <p className="text-2xl font-extrabold text-white mt-1">₹{totalRaised.toLocaleString("en-IN")}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium">Target Target</span>
                  <p className="text-sm font-bold text-slate-300 mt-1">₹{targetGoal.toLocaleString("en-IN")}</p>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="space-y-2">
                <div className="w-full bg-white/5 rounded-full h-3.5 overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500 shadow-lg shadow-indigo-500/20"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>{progressPercent}% Complete</span>
                  <span>{payments.length} support payments received</span>
                </div>
              </div>
            </div>

            {/* Supporters Activity Timeline */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-6">Recent Activity Feed</h3>
              
              {payments.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-slate-500 text-sm">No supporters yet. Be the first to fuel this journey! 🚀</p>
                </div>
              ) : (
                <div className="relative border-l border-white/5 pl-6 space-y-6">
                  {payments.map((p) => (
                    <div key={p._id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border-2 border-indigo-500"></span>
                      
                      {/* Donation Info Card */}
                      <div className="bg-white/[0.01] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all">
                        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                          <span className="font-semibold text-white text-sm">{p.name}</span>
                          <span className="text-xs font-bold text-indigo-400 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded-md">
                            Donated ₹{p.amount}
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm italic">&ldquo;{p.message}&rdquo;</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Payment Widget (40% / 5 cols) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            
            {/* Donation Card */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 backdrop-blur-md shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center border border-white/10">
                  <span className="text-lg">☕</span>
                </div>
                <h3 className="text-lg font-bold text-white">Support Creator</h3>
              </div>

              {/* Warn if own profile */}
              {isSelfProfile ? (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-xs font-medium mb-6">
                  ⚠️ This is your own profile page. Self-payment is restricted on GetMeAChai.
                </div>
              ) : !currentUser.razorpayid ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium mb-6">
                  ⚠️ This creator has not configured their payment keys in settings.
                </div>
              ) : null}

              {/* Form Input fields */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Your Name</label>
                  <input
                    onChange={handleChange}
                    name="name"
                    value={paymentform.name}
                    type="text"
                    placeholder="Enter your name"
                    disabled={isSelfProfile || !currentUser.razorpayid || isProcessing}
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Message</label>
                  <input
                    onChange={handleChange}
                    name="description"
                    value={paymentform.description}
                    type="text"
                    placeholder="Leave a friendly message"
                    disabled={isSelfProfile || !currentUser.razorpayid || isProcessing}
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm disabled:opacity-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Donation Amount (₹)</label>
                  <input
                    onChange={handleChange}
                    name="amount"
                    value={paymentform.amount}
                    type="number"
                    placeholder="Enter Custom Amount"
                    min="1"
                    disabled={isSelfProfile || !currentUser.razorpayid || isProcessing}
                    className="w-full px-4 py-3 bg-white/5 border border-white/15 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm disabled:opacity-50"
                  />
                </div>

                {/* Quick Selection Buttons */}
                <div className="grid grid-cols-4 gap-2 pt-2">
                  {[5, 10, 20, 50].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => pay(amt)}
                      disabled={!isFormValid || !currentUser.razorpayid || isSelfProfile || isProcessing}
                      className="py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 active:scale-[0.97] rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition disabled:opacity-30 disabled:pointer-events-none"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {/* Main Submit Action */}
                <button
                  onClick={() => pay(paymentform.amount)}
                  disabled={
                    !isFormValid ||
                    paymentform.amount.length < 1 ||
                    !currentUser.razorpayid ||
                    isSelfProfile ||
                    isProcessing
                  }
                  className="w-full py-3 mt-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </>
                  ) : (
                    `Pay ₹${paymentform.amount || "0"}`
                  )}
                </button>

              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}

export default PaymentPage
