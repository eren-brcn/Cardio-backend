const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authRouter = express.Router();

const getJwtSecret = () => process.env.JWT_SECRET || "dev-only-change-me";
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const toAuthResponse = (user) => {
  const token = jwt.sign(
    {
      userId: String(user._id),
      email: user.email
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email
    }
  };
};

authRouter.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();
    const normalizedName = String(name || "").trim();
    const normalizedPassword = String(password || "");

    if (!normalizedName || !normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "name, email and password are required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (normalizedPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 12);
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash
    });

    return res.status(201).json(toAuthResponse(user));
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").toLowerCase().trim();
    const normalizedPassword = String(password || "");

    if (!normalizedEmail || !normalizedPassword) {
      return res.status(400).json({ message: "email and password are required" });
    }

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await bcrypt.compare(normalizedPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json(toAuthResponse(user));
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = authRouter;
