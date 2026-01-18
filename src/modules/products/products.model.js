import mongoose from "mongoose";

// a data model is created from a data product schema

const productSchema = new mongoose.Schema(
  {
    order: { type: String, required: true, unique: true, minlength: 7, minlength: 7, trim: true },
    customer: { type: String, required: true, trim: true },
    product: { type: String, enum: ["product-1", "product-2", "product-3", "product-4", "product-5" ] },
    amount: { type: Number, required: true, trim: true, set: v => Math.round(v * 100) / 100  },
  },
  {
    timestamps: true,
  }
);

// mongodb will automatically create products collection

export const Product = mongoose.model("Product", productSchema);
