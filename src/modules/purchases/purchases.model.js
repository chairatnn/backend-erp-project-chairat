import mongoose from "mongoose";

// a data model is created from a data purchase schema

const purchaseSchema = new mongoose.Schema(
  {
    po: { type: String, required: true, unique: true, minlength: 7, minlength: 7, trim: true },
    material: { type: String, enum: ["rawmat-1", "rawmat-2", "rawmat-3", "rawmat-4", "rawmat-5" ] },
    supplier: { type: String, required: true, trim: true },
    cost: { type: Number, required: true, trim: true, set: v => Math.round(v * 100) / 100  },
  },
  {
    timestamps: true,
  }
);

// mongodb will automatically create po collection

export const Purchase = mongoose.model("Purchase", purchaseSchema);
