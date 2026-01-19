import {
  embedText,
  GEMINI_EMBEDDING_DIMS,
} from "../../services/gemini.client.js";
import { Purchase } from "./purchases.model.js";

const buildPurchaseEmbeddingText = (purchaseDoc) => {
  const po = purchaseDoc?.order ? String(purchaseDoc.po).trim() : "";
  const material = purchaseDoc?.material ? String(purchaseDoc.material).trim() : "";
  const supplier = purchaseDoc?.supplier ? String(purchaseDoc.supplier).trim() : "";
  const cost = purchaseDoc?.cost ? Number(purchaseDoc.cost).trim() : "";

  return [
    "Purchase profile:",
    `Po: ${po}`,
    `Material: ${material}`,
    `Supplier: ${supplier}`,
    `Cost: ${cost}`,
  ].join("\n");
};

export const embedPurchaseById = async (purchaseId) => {
  if (!purchaseId) {
    const error = new Error("userId is required");
    error.name = "ValidationError";
    error.status = 400;
    throw error;
  }

  await Purchase.findByIdAndUpdate(
    purchaseId,
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
    const purchase = await Purchase.findById(purchaseId).select(
      "po material supplier cost embedding.status"
    );

    if (!purchase) {
      const error = new Error("Po not found");
      error.name = "NotFoundError";
      error.status = 404;
      throw error;
    }
    console.log(purchase);
    const text = buildPurchaseEmbeddingText(purchase);
    console.log(text);
    const vector = await embedText({ text });
    console.log(vector);
    await Purchase.findByIdAndUpdate(
      purchaseId,
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

    await Purchase.findByIdAndUpdate(
      purchaseId,
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

export const queueEmbedPurchaseById = (purchaseId) => {
  setImmediate(() => {
    embedPurchaseById(purchaseId).catch((error) => {
      console.error("Async po embedding failed", {
        purchaseId,
        message: error?.message,
      });
    });
  });
};
