const express = require("express");
const User = require("../models/User");
const { requireAuth, requireSelfOrAdmin } = require("../middleware/auth");

const usersRouter = express.Router();

usersRouter.post("/", async (req, res) => {
  try {
    const { name, email, role, passwordHash } = req.body;

    if (!passwordHash) {
      return res.status(400).json({ message: "Use /auth/register to create users with a secure password" });
    }

    const user = await User.create({ name, email, role: role || "user", passwordHash });
    return res.status(201).json(user);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

usersRouter.post("/:userId/workouts", requireAuth, requireSelfOrAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.workouts.push(req.body);
    await user.save();

    return res.status(201).json({
      message: "Workout added",
      userId: user._id,
      workoutsCount: user.workouts.length
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = usersRouter;
