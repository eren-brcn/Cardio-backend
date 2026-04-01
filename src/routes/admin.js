const express = require("express");
const User = require("../models/User");
const { summarizeProgress } = require("../utils/progress");

const adminRouter = express.Router();

adminRouter.get("/users", async (_req, res) => {
  try {
    const users = await User.find().lean();

    const result = users.map((user) => {
      const summary = summarizeProgress(user.workouts || []);
      const activeExercises = [...new Set((user.workouts || []).map((w) => w.exerciseName))].filter(Boolean);

      return {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        workoutsCount: (user.workouts || []).length,
        activeExercises,
        totalImprovementKg: summary.totalImprovementKg,
        lastWorkoutAt: user.workouts?.length ? user.workouts[user.workouts.length - 1].workoutDate : null
      };
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

adminRouter.get("/users/:userId/progress", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const summary = summarizeProgress(user.workouts || []);

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      workoutsCount: (user.workouts || []).length,
      totalImprovementKg: summary.totalImprovementKg,
      exerciseProgress: summary.exerciseProgress
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = adminRouter;
