import { NextResponse } from "next/server"
import connectDb from "@/db/connectDb"
import User from "@/models/User"
import Payment from "@/models/Payment"
import { decrypt } from "@/db/crypto"
import crypto from "crypto"

export async function POST(req) {
    try {
        // Read raw body as text — essential for cryptographic signature verification
        const rawBody = await req.text()
        const signature = req.headers.get("x-razorpay-signature")

        if (!signature) {
            return NextResponse.json(
                { success: false, message: "Missing Razorpay signature header" },
                { status: 400 }
            )
        }

        // Parse payload
        let body
        try {
            body = JSON.parse(rawBody)
        } catch {
            return NextResponse.json(
                { success: false, message: "Invalid JSON payload" },
                { status: 400 }
            )
        }

        const event = body.event
        // We handle payment.captured which indicates successful transaction completion
        if (event !== "payment.captured") {
            return NextResponse.json(
                { success: true, message: `Ignored unhandled event: ${event}` },
                { status: 200 }
            )
        }

        const paymentEntity = body.payload?.payment?.entity
        if (!paymentEntity) {
            return NextResponse.json(
                { success: false, message: "Missing payment entity in payload" },
                { status: 400 }
            )
        }

        const orderId = paymentEntity.order_id
        const paymentId = paymentEntity.id

        if (!orderId) {
            return NextResponse.json(
                { success: false, message: "Missing order_id in payment entity" },
                { status: 400 }
            )
        }

        await connectDb()

        // 1. Locate the pending payment order record
        const payment = await Payment.findOne({ oid: orderId })
        if (!payment) {
            return NextResponse.json(
                { success: false, message: "Payment order record not found in database" },
                { status: 404 }
            )
        }

        // 2. Fetch the recipient creator to retrieve their Webhook Secret
        const user = await User.findOne({ username: payment.to_username }).select("+razorpaywebhooksecret")
        if (!user) {
            return NextResponse.json(
                { success: false, message: "Recipient user not found" },
                { status: 404 }
            )
        }

        // 3. Resolve the Webhook Secret key (decrypt merchant's or fallback to platform's env var)
        let webhookSecret
        if (user.razorpaywebhooksecret && user.razorpaywebhooksecret.trim() !== "") {
            try {
                webhookSecret = decrypt(user.razorpaywebhooksecret)
            } catch {
                webhookSecret = user.razorpaywebhooksecret // Fallback: unencrypted legacy key
            }
        } else {
            webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
        }

        if (!webhookSecret || webhookSecret.trim() === "") {
            return NextResponse.json(
                { success: false, message: "Webhook secret is not configured" },
                { status: 400 }
            )
        }

        // 4. Verify HMAC-SHA256 Webhook Signature
        const expectedSignature = crypto
            .createHmac("sha256", webhookSecret)
            .update(rawBody)
            .digest("hex")

        if (expectedSignature !== signature) {
            return NextResponse.json(
                { success: false, message: "Invalid webhook signature" },
                { status: 400 }
            )
        }

        // 5. Signature matches! If not already marked completed, update database record
        if (!payment.status) {
            payment.status = true
            payment.razorpay_payment_id = paymentId
            await payment.save()
        }

        return NextResponse.json(
            { success: true, message: "Webhook processed and payment verified successfully" },
            { status: 200 }
        )

    } catch (error) {
        console.error("Webhook processing error:", error)
        return NextResponse.json(
            { success: false, message: "Internal server error occurred during webhook processing" },
            { status: 500 }
        )
    }
}
