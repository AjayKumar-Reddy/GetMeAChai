import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema({
    name: { type: String, required: true },
    from_username: { type: String },           // who paid (audit trail)
    to_username: { type: String, required: true },
    oid: { type: String, required: true },     // Razorpay order ID
    razorpay_payment_id: { type: String },     // Razorpay payment ID (for tracking/refunds)
    message: { type: String },
    amount: { type: Number, required: true },
    status: { type: Boolean, default: false }  // false = pending, true = completed
}, { timestamps: true });

const Payment = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
export default Payment;