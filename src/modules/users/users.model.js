import mongoose from "mongoose";
import bcrypt from "bcrypt";

// a data model is created from a data user schema

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6, select: false },
    embedding: {
      status: {
        type: String,
        enum: ["PENDING", "PROCESSING", "READY", "FAILED"],
        default: "PENDING",
      },
      dims: { type: Number, default: 3072 },
      vectors: { type: [Number], select: false },
      attempts: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
      updatedAt: { type: Date, default: null },
      lastError: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// mongodb will automatically create users collection

export const User = mongoose.model("User", userSchema);
