import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.DATABASE_URL || "mongodb://127.0.0.1:27017/linkedin_post_mcp";
    console.log(`🔌 Connecting to MongoDB: ${mongoURI}`);
    await mongoose.connect(mongoURI, {});
    console.log("✅ MongoDB Connected successfully.");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
