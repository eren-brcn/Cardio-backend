const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const analyticsRouter = express.Router();

const asNonNegativeNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    return null;
  }
  return num;
};

// Add body measurement
analyticsRouter.post("/measurements", requireAuth, async (req, res) => {
  try {
    const { weight, waist, chest, arms, legs, notes } = req.body;
    const parsedWeight = Number(weight);

    if (weight === undefined || weight === null) {
      return res.status(400).json({ message: "weight is required" });
    }

    if (Number.isNaN(parsedWeight) || parsedWeight < 0) {
      return res.status(400).json({ message: "weight must be a non-negative number" });
    }

    const parsedWaist = asNonNegativeNumberOrNull(waist);
    const parsedChest = asNonNegativeNumberOrNull(chest);
    const parsedArms = asNonNegativeNumberOrNull(arms);
    const parsedLegs = asNonNegativeNumberOrNull(legs);

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.bodyMeasurements.push({
      date: new Date(),
      weight: parsedWeight,
      waist: parsedWaist,
      chest: parsedChest,
      arms: parsedArms,
      legs: parsedLegs,
      notes: notes ? String(notes).trim() : ""
    });

    await user.save();
    return res.status(201).json(user.bodyMeasurements[user.bodyMeasurements.length - 1]);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Get body measurements
analyticsRouter.get("/measurements", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const measurements = (user.bodyMeasurements || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return res.json(measurements);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Delete measurement
analyticsRouter.delete("/measurements/:measurementId", requireAuth, async (req, res) => {
  try {
    const { measurementId } = req.params;
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.bodyMeasurements = user.bodyMeasurements.filter(
      (m) => String(m._id) !== measurementId
    );

    await user.save();
    return res.json({ message: "Measurement deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Create goal
analyticsRouter.post("/goals", requireAuth, async (req, res) => {
  try {
    const { title, description, targetValue, unit, deadline } = req.body;
    const parsedTargetValue = Number(targetValue);

    if (!title || targetValue === undefined) {
      return res.status(400).json({ message: "title and targetValue are required" });
    }

    if (Number.isNaN(parsedTargetValue) || parsedTargetValue <= 0) {
      return res.status(400).json({ message: "targetValue must be a positive number" });
    }

    const parsedDeadline = deadline ? new Date(deadline) : null;
    if (parsedDeadline && Number.isNaN(parsedDeadline.getTime())) {
      return res.status(400).json({ message: "deadline is invalid" });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.goals.push({
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      targetValue: parsedTargetValue,
      currentValue: 0,
      unit: unit || "",
      deadline: parsedDeadline,
      completed: false
    });

    await user.save();
    return res.status(201).json(user.goals[user.goals.length - 1]);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Get goals
analyticsRouter.get("/goals", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const goals = (user.goals || [])
      .map((goal) => ({
        ...goal,
        progress: goal.targetValue > 0 ? (goal.currentValue / goal.targetValue * 100) : 0
      }))
      .sort((a, b) => (a.completed ? 1 : -1));

    return res.json(goals);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Update goal
analyticsRouter.put("/goals/:goalId", requireAuth, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { currentValue, completed } = req.body;

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const goal = user.goals.id(goalId);
    if (!goal) {
      return res.status(404).json({ message: "Goal not found" });
    }

    if (currentValue !== undefined) {
      const parsedCurrentValue = Number(currentValue);
      if (Number.isNaN(parsedCurrentValue) || parsedCurrentValue < 0) {
        return res.status(400).json({ message: "currentValue must be a non-negative number" });
      }
      goal.currentValue = parsedCurrentValue;
    }
    if (completed !== undefined) goal.completed = Boolean(completed);

    await user.save();
    return res.json(goal);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Delete goal
analyticsRouter.delete("/goals/:goalId", requireAuth, async (req, res) => {
  try {
    const { goalId } = req.params;
    const user = await User.findById(req.auth.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.goals = user.goals.filter((g) => String(g._id) !== goalId);
    await user.save();

    return res.json({ message: "Goal deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get monthly summary
analyticsRouter.get("/summary/monthly", requireAuth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const parsedMonth = Number(month);
    const parsedYear = Number(year);

    if (!Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
      return res.status(400).json({ message: "month must be an integer between 1 and 12" });
    }

    if (!Number.isInteger(parsedYear) || parsedYear < 1970 || parsedYear > 3000) {
      return res.status(400).json({ message: "year must be a valid integer" });
    }

    const targetMonth = new Date(parsedYear, parsedMonth - 1, 1);
    const nextMonth = new Date(parsedYear, parsedMonth, 1);

    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const monthlyWorkouts = (user.workouts || []).filter((w) => {
      const wDate = new Date(w.workoutDate);
      return wDate >= targetMonth && wDate < nextMonth;
    });

    const totalWeight = monthlyWorkouts.reduce((sum, w) => sum + (w.currentWeight || 0), 0);
    const avgReps = monthlyWorkouts.length > 0
      ? (monthlyWorkouts.reduce((sum, w) => sum + (w.reps || 0), 0) / monthlyWorkouts.length).toFixed(1)
      : 0;
    const avgSets = monthlyWorkouts.length > 0
      ? (monthlyWorkouts.reduce((sum, w) => sum + (w.sets || 0), 0) / monthlyWorkouts.length).toFixed(1)
      : 0;

    return res.json({
      month: parsedMonth,
      year: parsedYear,
      workoutCount: monthlyWorkouts.length,
      totalWeight,
      avgReps,
      avgSets,
      exercisesLogged: new Set(monthlyWorkouts.map((w) => w.exerciseName)).size
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get strength progression (max weight per exercise over time)
analyticsRouter.get("/progression", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const exerciseMaxes = {};
    (user.workouts || []).forEach((w) => {
      const exercise = String(w.exerciseName || "").trim();
      if (!exercise) return;

      if (!exerciseMaxes[exercise]) {
        exerciseMaxes[exercise] = {
          name: exercise,
          maxWeight: w.currentWeight || 0,
          lastDate: w.workoutDate
        };
      } else {
        if ((w.currentWeight || 0) > exerciseMaxes[exercise].maxWeight) {
          exerciseMaxes[exercise].maxWeight = w.currentWeight || 0;
          exerciseMaxes[exercise].lastDate = w.workoutDate;
        }
      }
    });

    const progression = Object.values(exerciseMaxes)
      .sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

    return res.json(progression);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = analyticsRouter;
