import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: { type: String },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    profilepic: { type: String },
    coverpic: { type: String },
    razorpayid: { type: String },
    // select: false ensures this field is NEVER returned by default.
    // Must explicitly use .select('+razorpaysecret') to include it.
    razorpaysecret: { type: String, select: false },
    razorpaywebhooksecret: { type: String, select: false },
    // Hashed password for credentials login
    password: { type: String, select: false },
    bio: { type: String, maxLength: 250 },
    goal: { type: Number, default: 10000 },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;