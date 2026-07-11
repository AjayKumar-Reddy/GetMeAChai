"use server"

import Razorpay from "razorpay"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authoptions"
import connectDb from "@/db/connectDb"
import User from "@/models/User"
import Payment from "@/models/Payment"
import { encrypt, decrypt } from "@/db/crypto"
import bcrypt from "bcryptjs"

/**
 * Initiate a Razorpay payment order.
 * - Validates inputs server-side
 * - Prevents self-payment
 * - Decrypts recipient's Razorpay secret to create order
 * - Records pending payment in DB
 */
export const initiate = async (amount, to_username, paymentform) => {
    // ── Input validation ──
    if (!amount || !to_username) {
        throw new Error("Missing required fields")
    }
    if (!paymentform?.name || paymentform.name.length < 2) {
        throw new Error("Name must be at least 2 characters")
    }
    if (!paymentform?.description || paymentform.description.length < 3) {
        throw new Error("Message must be at least 3 characters")
    }

    const parsedAmount = Number.parseInt(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Amount must be a positive number")
    }
    if (parsedAmount > 500000) {
        throw new Error("Amount exceeds maximum limit")
    }

    // ── Auth & self-payment check ──
    const session = await getServerSession(authOptions)

    if (session?.user?.name === to_username) {
        throw new Error("You cannot pay yourself")
    }

    await connectDb()

    // ── Fetch recipient with encrypted secret ──
    let user = await User.findOne({ username: to_username }).select("+razorpaysecret")
    if (!user) {
        throw new Error("Recipient not found")
    }
    if (!user.razorpayid || !user.razorpaysecret) {
        throw new Error("Recipient has not configured their payment gateway")
    }

    // ── Decrypt secret for Razorpay API ──
    let decryptedSecret
    try {
        decryptedSecret = decrypt(user.razorpaysecret)
    } catch {
        // Fallback: legacy unencrypted data
        decryptedSecret = user.razorpaysecret
    }

    // ── Create Razorpay order ──
    let instance = new Razorpay({
        key_id: user.razorpayid,
        key_secret: decryptedSecret,
    })

    const options = {
        amount: parsedAmount * 100, // Razorpay expects paise
        currency: "INR",
    }

    let order = await instance.orders.create(options)
    if (!order) {
        throw new Error("Failed to create Razorpay order")
    }

    // ── Record pending payment ──
    const payment = new Payment({
        name: paymentform.name,
        from_username: session?.user?.name || "anonymous",
        to_username: to_username,
        oid: order.id,
        message: paymentform.description,
        amount: parsedAmount,
    })
    await payment.save()

    return order
}

/**
 * Fetch a user's public profile (no secrets).
 * razorpaysecret is excluded automatically via select:false in schema.
 */
export const fetchUser = async (username) => {
    await connectDb()
    let u = await User.findOne({ username: username }).lean()
    if (!u) return null
    u._id = u._id.toString()
    return u
}

/**
 * Fetch completed payments for a user's profile page.
 */
export const fetchPayments = async (username) => {
    await connectDb()
    let payments = await Payment.find({ to_username: username, status: true })
        .sort({ createdAt: -1 })
        .lean()
    return (payments || []).map((p) => ({ ...p, _id: p._id.toString() }))
}

/**
 * Update the authenticated user's profile.
 * - Uses session email as immutable identifier (cannot be spoofed)
 * - Only allows updating specific fields (prevents mass assignment)
 * - Encrypts razorpaysecret if provided
 */
export const updateProfile = async (profiledata) => {
    const session = await getServerSession(authOptions)
    if (!session) return { success: false, message: "Not authenticated" }

    await connectDb()

    // Get current user by session email (cannot be spoofed by client)
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) return { success: false, message: "User not found" }

    const oldUsername = currentUser.username

    // ── Validate inputs ──
    if (!profiledata.username || profiledata.username.length < 2) {
        return { success: false, message: "Username must be at least 2 characters" }
    }
    if (profiledata.username.length > 30) {
        return { success: false, message: "Username must be less than 30 characters" }
    }
    // Only allow alphanumeric and underscores in username
    if (!/^[a-zA-Z0-9_]+$/.test(profiledata.username)) {
        return { success: false, message: "Username can only contain letters, numbers, and underscores" }
    }

    // ── Whitelist allowed fields (prevents mass assignment) ──
    const allowedFields = {
        name: profiledata.name || "",
        username: profiledata.username,
        profilepic: profiledata.profilepic || "",
        coverpic: profiledata.coverpic || "",
        razorpayid: profiledata.razorpayid || "",
    }

    // ── Handle razorpaysecret separately — encrypt if provided ──
    if (profiledata.razorpaysecret && profiledata.razorpaysecret.trim() !== "") {
        allowedFields.razorpaysecret = encrypt(profiledata.razorpaysecret)
    }
    // If not provided, existing encrypted secret is preserved

    // ── Check username uniqueness if changed ──
    if (oldUsername !== allowedFields.username) {
        const existingUser = await User.findOne({ username: allowedFields.username })
        if (existingUser) {
            return { success: false, message: "Username already taken" }
        }
        // Update username across payments collection
        await Payment.updateMany(
            { to_username: oldUsername },
            { to_username: allowedFields.username }
        )
    }

    // Update using session email (immutable identifier — secure)
    await User.updateOne({ email: session.user.email }, allowedFields)

    return { success: true, message: "Profile updated successfully" }
}

/**
 * Fetch the authenticated user's own data for the dashboard.
 * - Returns hasRazorpaySecret flag (not the actual value)
 * - Only accessible by the logged-in user
 */
export const fetchUserDashboard = async () => {
    const session = await getServerSession(authOptions)
    if (!session) return null

    await connectDb()
    const user = await User.findOne({ email: session.user.email })
        .select("+razorpaysecret")
        .lean()
    if (!user) return null

    user._id = user._id.toString()
    const hasRazorpaySecret = !!user.razorpaysecret

    // Strip the actual secret before sending to client
    delete user.razorpaysecret

    return { ...user, hasRazorpaySecret }
}

/**
 * Fetch all users for the search feature (public data only).
 * Only returns name, username, and profilepic — no sensitive fields.
 */
export const fetchAllUser = async () => {
    await connectDb()
    let users = await User.find({}).lean()
    if (!users) return []

    // Return only public fields
    return users.map((user) => ({
        _id: user._id.toString(),
        name: user.name,
        username: user.username,
        profilepic: user.profilepic,
    }))
}

/**
 * Register a new user with Email, Username, and Password.
 * - Checks if email or username is already taken.
 * - Hashes the password using bcryptjs.
 */
export const registerUser = async (signupData) => {
    const { username, email, name, password } = signupData

    // ── Input Validation ──
    if (!username || !email || !password) {
        return { success: false, message: "Missing required fields" }
    }
    if (username.length < 2) {
        return { success: false, message: "Username must be at least 2 characters" }
    }
    if (password.length < 6) {
        return { success: false, message: "Password must be at least 6 characters" }
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        return { success: false, message: "Username can only contain letters, numbers, and underscores" }
    }

    await connectDb()

    // ── Check if email or username already exists ──
    const existingEmail = await User.findOne({ email: email.toLowerCase() })
    if (existingEmail) {
        return { success: false, message: "Email is already registered" }
    }

    const existingUsername = await User.findOne({ username: username.toLowerCase() })
    if (existingUsername) {
        return { success: false, message: "Username is already taken" }
    }

    // ── Hash Password ──
    const hashedPassword = await bcrypt.hash(password, 12)

    // ── Create User ──
    const newUser = new User({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        name: name || username,
        password: hashedPassword,
    })

    await newUser.save()

    return { success: true, message: "User registered successfully!" }
}

