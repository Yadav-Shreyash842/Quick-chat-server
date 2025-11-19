import mongoose from "mongoose";

// Function to connect to MongoDB
export const connectDB = async () => {
  try {

    mongoose.connection.on("connected", () => {
      console.log("✅ Database connected");
    });

    // Connect using the full URI from .env
    await mongoose.connect(process.env.MONGODB_URI);

  } catch (error) {
    console.log("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};
