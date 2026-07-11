import { NextResponse } from "next/server";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import connectDb from "@/db/connectDb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { decrypt } from "@/db/crypto";

/**
 * POST /api/razorpay
 * Verifies Razorpay payment signature after checkout.
 * Called by the client-side handler (not callback_url).
 * 
 * Flow:
 * 1. Client sends {razorpay_payment_id, razorpay_order_id, razorpay_signature}
 * 2. Server looks up the pending payment by order_id
 * 3. Decrypts recipient's Razorpay secret
 * 4. Validates the signature
 * 5. Marks payment as completed
 * 6. Returns JSON response (not redirect)
 */
export async function POST(request) {
    await connectDb()

    try {
        const body = await request.json()
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = body

        // ── Validate required fields ──
        if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
            return NextResponse.json(
                { success: false, message: "Missing payment verification details" },
                { status: 400 }
            )
        }

        // ── Find pending payment ──
        let payment = await Payment.findOne({ oid: razorpay_order_id })
        if (!payment) {
            return NextResponse.json(
                { success: false, message: "Order not found" },
                { status: 404 }
            )
        }

        // ── Prevent duplicate verification ──
        if (payment.status === true) {
            return NextResponse.json(
                { success: true, message: "Payment already verified" }
            )
        }

        // ── Get recipient's secret for signature verification ──
        let user = await User.findOne({ username: payment.to_username }).select("+razorpaysecret")
        if (!user || !user.razorpaysecret) {
            return NextResponse.json(
                { success: false, message: "Recipient configuration error" },
                { status: 500 }
            )
        }

        // ── Decrypt the secret ──
        let secret
        try {
            secret = decrypt(user.razorpaysecret)
        } catch {
            // Fallback: legacy unencrypted data
            secret = user.razorpaysecret
        }

        // ── Verify payment signature (Razorpay HMAC-SHA256) ──
        const isAuthentic = validatePaymentVerification(
            {
                order_id: razorpay_order_id,
                payment_id: razorpay_payment_id,
            },
            razorpay_signature,
            secret
        )

        if (isAuthentic) {
            // Mark payment as completed and store Razorpay payment ID
            await Payment.findOneAndUpdate(
                { oid: razorpay_order_id },
                {
                    status: true,
                    razorpay_payment_id: razorpay_payment_id,
                },
                { new: true }
            )

            return NextResponse.json({
                success: true,
                message: "Payment verified successfully",
            })
        } else {
            return NextResponse.json(
                { success: false, message: "Payment signature verification failed" },
                { status: 400 }
            )
        }
    } catch (err) {
        console.error("Razorpay verification error:", err)
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        )
    }
}