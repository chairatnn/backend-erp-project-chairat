import { Router } from "express";
import { User } from "../../modules/users/users.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { authUser } from "../../middlewares/auth.js";
import { askPurchase2, createPurchase2, deletePurchase2, getPurchase2, getPurchases2, updatePurchase2 } from "../../modules/purchases/purchases.controller.js";
import { Purchase } from "../../modules/purchases/purchases.model.js";

export const router = Router();

router.get("/", getPurchases2);

// Check user authentication (check if user has valid token)
router.get("/auth/cookie/me", authUser, async (req, res, next) => {
  try {
    const userId = req.user.user._id;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({
        error: true,
        message: "Unauthenticated",
      });
    }

    res.status(200).json({
      error: false,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/ai/ask", authUser, askPurchase2);

router.get("/:id", getPurchase2);

router.post("/", createPurchase2);

router.delete("/:id", authUser, deletePurchase2);

router.patch("/:id", authUser, updatePurchase2);

// Login a user - jwt signed token (token in cookies)
router.post("/auth/cookie/login", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Email and Password are required...",
    });
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase();

    const purchase = await Purchase.findOne({ email: normalizedEmail }).select(
      "+password"
    );

    if (!purchase) {
      return res.status(401).json({
        error: true,
        message: "User not found...",
      });
    }

    const isMatched = await bcrypt.compare(password, purchase.password);

    if (!isMatched) {
      return res.status(401).json({
        error: true,
        message: "Invalid password...",
      });
    }
    // Generate JSON Web Token
    const token = jwt.sign({ purchaseId: purchase._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    const isProd = process.env.NODE_ENV === "production";

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 60 * 60 * 1000, // 1 hour
    });

    res.status(200).json({
      error: false,
      message: "Login successful",
      token: token,
      user: {
        _id: purchase._id,
        po: purchase.po,
        material: purchase.material,
        supplier: purchase.supplier,
        cost: purchase.cost,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Logout a user
router.post("/auth/cookie/logout", (req, res) => {
  const isProd = process.env.NODE_ENV === "production";

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  });

  res.status(200).json({
    error: false,
    message: "Logged out successfully",
  });
});
