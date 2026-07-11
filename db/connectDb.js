import mongoose from "mongoose";

const connectDB = async () => {
    // Skip if already connected (connection pooling)
    if (mongoose.connection.readyState >= 1) return;

    try {
        const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/chai";
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("Error connecting to database:", error.message);
        // Don't process.exit(1) — that kills the entire serverless instance.
        // Throw so the calling function can handle the error gracefully.
        throw new Error("Database connection failed");
    }
};

export default connectDB;