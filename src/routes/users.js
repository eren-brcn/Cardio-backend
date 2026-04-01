const express = require("express");
const User = require("../models/User");
const { requireAuth, requireSelfOrAdmin } = require("../middleware/auth");
const { summarizeProgress } = require("../utils/progress");

const usersRouter = express.Router();

const validateWorkoutPayload = (body) => {
  const exerciseName = String(body.exerciseName || "").trim();
  const category = String(body.category || "General").trim();
  const currentWeight = Number(body.currentWeight);
  const reps = Number(body.reps || 0);
  const sets = Number(body.sets || 0);
  const workoutDate = body.workoutDate || new Date().toISOString();

  if (!exerciseName) {
    return { error: "exerciseName is required" };
  }

  if (Number.isNaN(currentWeight) || currentWeight < 0) {
    return { error: "currentWeight must be a non-negative number" };
  }

  if (Number.isNaN(reps) || reps < 0 || Number.isNaN(sets) || sets < 0) {
    return { error: "reps and sets must be non-negative numbers" };
  }

  return {
    value: {
      exerciseName,
      category,
      currentWeight,
      reps,
      sets,
      workoutDate
    }
  };
};

usersRouter.post("/:userId/workouts", requireAuth, requireSelfOrAdmin, async (req, res) => {
  try {
    const validation = validateWorkoutPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.workouts.push(validation.value);
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

usersRouter.post("/me/workouts", requireAuth, async (req, res) => {
  try {
    const validation = validateWorkoutPayload(req.body);
    if (validation.error) {
      return res.status(400).json({ message: validation.error });
    }

    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.workouts.push(validation.value);
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

usersRouter.get("/me/workouts", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user.workouts || []);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

usersRouter.get("/me/progress", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const workouts = user.workouts || [];
    const summary = summarizeProgress(workouts);

    return res.json({
      userId: user._id,
      workoutsCount: workouts.length,
      totalImprovementKg: summary.totalImprovementKg,
      exerciseProgress: summary.exerciseProgress
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

usersRouter.get("/me/export", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      exportedAt: new Date().toISOString(),
      profile: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      workouts: user.workouts || []
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

usersRouter.delete("/me", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();
    return res.json({ message: "Account deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = usersRouter;
