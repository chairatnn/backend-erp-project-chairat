import {
  embedText,
  GEMINI_EMBEDDING_DIMS,
} from "../../services/gemini.client.js";
import { Product } from "./products.model.js";

const buildProductEmbeddingText = (productDoc) => {
  const order = productDoc?.order ? String(productDoc.order).trim() : "";
  const customer = productDoc?.customer ? String(productDoc.customer).trim() : "";
  const product = productDoc?.product ? String(productDoc.product).trim() : "";
  const amount = productDoc?.amount ? Number(productDoc.amount).trim() : "";

  return [
    "Product profile:",
    `Order: ${order}`,
    `Customer: ${customer}`,
    `Product: ${product}`,
    `Amount: ${amount}`,
  ].join("\n");
};

export const embedProductById = async (productId) => {
  if (!productId) {
    const error = new Error("userId is required");
    error.name = "ValidationError";
    error.status = 400;
    throw error;
  }

  await Product.findByIdAndUpdate(
    productId,
    {
      $set: {
        "embedding.status": "PROCESSING",
        "embedding.lastAttemptAt": new Date(),
      },
      $inc: { "embedding.attempts": 1 },
    },
    { new: false }
  );

  try {
    const product = await Product.findById(productId).select(
      "order customer product amount embedding.status"
    );

    if (!product) {
      const error = new Error("Product not found");
      error.name = "NotFoundError";
      error.status = 404;
      throw error;
    }
    console.log(product);
    const text = buildProductEmbeddingText(product);
    console.log(text);
    const vector = await embedText({ text });
    console.log(vector);
    await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          "embedding.status": "READY",
          "embedding.vectors": vector,
          "embedding.dims": GEMINI_EMBEDDING_DIMS,
          "embedding.updateAt": new Date(),
          "embedding.lastError": null,
        },
      },
      { new: false }
    );

    return { ok: true };
  } catch (error) {
    const message = String(error?.message || "Embedding failed");

    await Product.findByIdAndUpdate(
      productId,
      {
        $set: {
          "embedding.status": "FAILED",
          "embedding.lastError": message,
        },
      },
      { new: false }
    );
    return { ok: false, error: message };
  }
};

export const queueEmbedProductById = (productId) => {
  setImmediate(() => {
    embedProductById(productId).catch((error) => {
      console.error("Async product embedding failed", {
        productId,
        message: error?.message,
      });
    });
  });
};
