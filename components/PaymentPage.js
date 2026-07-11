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
    setcurrentUser(u)
    const dbpayments = await fetchPayments(username)
    setPayments(dbpayments)
  }

  function handleChange(e) {
    setPaymentform({ ...paymentform, [e.target.name]: e.target.value })
  }

  const pay = async (amount) => {
    // ── Client-side validation (server also validates) ──
    if (!paymentform.name || paymentform.name.length < 2) {
      toast.error("Please enter your name (at least 2 characters)", { theme: "light", transition: Bounce })
      return
    }
    if (!paymentform.description || paymentform.description.length < 3) {
      toast.error("Please enter a message (at least 3 characters)", { theme: "light", transition: Bounce })
      return
    }
    if (amount <= 0) {
      toast.error("Amount should be greater than zero", { theme: "light", transition: Bounce })
      return
    }

    // Self-payment check (server also enforces this)
    if (session?.user?.name === username) {
      toast.error("You cannot donate to yourself", { theme: "light", transition: Bounce })
      return
    }

    setIsProcessing(true)

    try {
      let order = await initiate(amount, username, paymentform)

      if (!order || !order.id) {
        toast.error("Failed to create order. Please try again.", { theme: "light", transition: Bounce })
        setIsProcessing(false)
        return
      }

      const options = {
        key: currentUser.razorpayid,
        amount: order.amount,
        currency: order.currency,
        name: "Get Me a Chai",
        description: `Supporting ${username}`,
        order_id: order.id,

        // ── This is the FIX: use handler instead of callback_url ──
        // In popup mode, Razorpay calls this function after payment.
        // We then verify the payment on our backend.
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
                theme: "light",
                transition: Bounce,
              })
              setPaymentform({ name: "", description: "", amount: "" })
              await getData() // Refresh payment list and stats
            } else {
              toast.error(`Verification failed: ${data.message}`, {
                theme: "light",
                transition: Bounce,
              })
            }
          } catch (err) {
            console.error("Payment verification error:", err)
            toast.error("Payment verification error. Please contact support.", {
              theme: "light",
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
        theme: { color: "#3399cc" },
        modal: {
          ondismiss: function () {
            setIsProcessing(false)
          },
        },
      }

      const rzp1 = new Razorpay(options)
      rzp1.on("payment.failed", function (response) {
        toast.error(`Payment failed: ${response.error.description}`, {
          theme: "light",
          transition: Bounce,
        })
        setIsProcessing(false)
      })
      rzp1.open()
    } catch (err) {
      toast.error(err.message || "Something went wrong", { theme: "light", transition: Bounce })
      setIsProcessing(false)
    }
  }

  const isSelfProfile = session?.user?.name === username
  const isFormValid = paymentform.name.length >= 2 && paymentform.description.length >= 3

  return (
    <>
      <ToastContainer position="top-right" autoClose={5000} theme="light" transition={Bounce} />
      <Script src="https://checkout.razorpay.com/v1/checkout.js"></Script>

      {/* Cover + Profile Section */}
      <div className="relative w-full h-60 md:h-72">
        <Image src={currentUser?.coverpic || "/avatar.gif"} alt="Cover img" fill className="object-cover" />
        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2">
          <div className="w-28 h-28 relative">
            <Image
              src={currentUser?.profilepic || "/avatar.gif"}
              alt="User profile"
              fill
              className="rounded-full object-cover border-4 border-white shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="text-center mt-16 space-y-3">
        <h1 className="font-bold text-2xl md:text-3xl">@{username}</h1>
        <p className="text-gray-500">Let&apos;s help each other grow by sharing a chai ☕</p>
        <div className="text-gray-600 text-sm md:text-base">
          <p>
            {currentUser?.razorpayid
              ? "✅ Ready to receive payments"
              : "⚠️ User not ready to receive payments"}
          </p>
          <p>
            {payments.length} Payments • ₹
            {payments.reduce((total, payment) => total + Number(payment.amount), 0)} Raised
          </p>
        </div>
        {isSelfProfile && (
          <p className="text-yellow-500 text-sm font-medium">
            ⚠️ This is your own profile. You cannot donate to yourself.
          </p>
        )}
      </div>

      {/* Payment + Supporters */}
      <div className="max-w-5xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 px-4 md:px-6 mb-16">
        {/* Supporters Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 overflow-y-auto max-h-[28rem]">
          <h2 className="text-xl font-bold mb-4 text-white">Supporters</h2>
          <ul className="space-y-4">
            {payments.length === 0 ? (
              <p className="text-slate-500 text-sm">No supporters yet. Be the first one!</p>
            ) : (
              payments.map((p) => (
                <li key={p._id} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-300">
                    <span className="font-semibold text-white">{p.name}</span> donated{" "}
                    <span className="font-bold text-indigo-400">₹{p.amount}</span> <br />
                    <span className="text-slate-400 italic mt-0.5 block">&ldquo;{p.message}&rdquo;</span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Payment Card */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold mb-4 text-white">Make a Payment</h2>
            <div className="space-y-4">
              <input
                onChange={handleChange}
                name="name"
                value={paymentform.name}
                type="text"
                placeholder="Your Name"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
              />
              <input
                onChange={handleChange}
                name="description"
                value={paymentform.description}
                type="text"
                placeholder="Message"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
              />
              <input
                onChange={handleChange}
                name="amount"
                value={paymentform.amount}
                type="number"
                placeholder="Custom Amount (₹)"
                min="1"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-4 mt-6">
            <button
              onClick={() => pay(paymentform.amount)}
              disabled={
                !isFormValid ||
                paymentform.amount.length < 1 ||
                !currentUser.razorpayid ||
                isSelfProfile ||
                isProcessing
              }
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? "Processing..." : `Pay ₹${paymentform.amount || '0'}`}
            </button>
            <div className="flex gap-2.5 flex-wrap">
              {[5, 10, 20, 50].map((amt) => (
                <button
                  key={amt}
                  onClick={() => pay(amt)}
                  disabled={!isFormValid || !currentUser.razorpayid || isSelfProfile || isProcessing}
                  className="flex-1 min-w-[60px] py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default PaymentPage
