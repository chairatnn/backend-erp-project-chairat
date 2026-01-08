import { User } from "./users.model.js";
import {
  embedText,
  GEMINI_EMBEDDING_DIMS,
} from "../../services/gemini.client.js";

const buildUserEmbeddingText = (userDoc) => {
  const username = userDoc?.username ? String(userDoc.username).trim() : "";
  const email = userDoc?.email ? String(userDoc.email).trim() : "";
  const role = userDoc?.role ? String(userDoc.role).trim() : "user";

  return [
    "User profile:",
    `Username: ${username}`,
    `Email: ${email}`,
    `Role: ${role}`,
  ].join("\n");
};

export const embedUserById = async (userId) => {
  if (!userId) {
    const error = new Error("userId is required");
    error.name = "ValidationError";
    error.status = 400;
    throw error;
  }

  await User.findByIdAndUpdate(
    userId,
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
    const user = await User.findById(userId).select(
      "username email role embedding.status"
    );

    if (!user) {
      const error = new Error("User not found");
      error.name = "NotFoundError";
      error.status = 404;
      throw error;
    }
  console.log(user);
    const text = buildUserEmbeddingText(user);
    console.log(text);
    const vector = await embedText({ text });
    console.log(vector);
    await User.findByIdAndUpdate(
      userId,
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

    await User.findByIdAndUpdate(
      userId,
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

export const queueEmbedUserById = (userId) => {
  setImmediate(() => {
    embedUserById(userId).catch((error) => {
      console.error("Async user embedding failed", {
        userId,
        message: error?.message,
      });
    });
  });
};
