const express = require("express");
const Meal = require("../models/Meal");
const { requireAuth } = require("../middleware/auth");

const nutritionRouter = express.Router();

const asNonNegativeNumber = (value, fallback = 0) => {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    return fallback;
  }
  return num;
};

// Add a meal
nutritionRouter.post("/meals", requireAuth, async (req, res) => {
  try {
    const { name, category, calories, protein, carbs, fat, notes, mealDate } = req.body;
    const parsedCalories = Number(calories);

    if (!name || calories === undefined) {
      return res.status(400).json({ message: "name and calories are required" });
    }

    if (Number.isNaN(parsedCalories) || parsedCalories < 0) {
      return res.status(400).json({ message: "calories must be a non-negative number" });
    }

    const parsedMealDate = mealDate ? new Date(mealDate) : new Date();
    if (Number.isNaN(parsedMealDate.getTime())) {
      return res.status(400).json({ message: "mealDate is invalid" });
    }

    const meal = await Meal.create({
      userId: req.auth.userId,
      name: name.trim(),
      category: category || "lunch",
      calories: parsedCalories,
      protein: asNonNegativeNumber(protein, 0),
      carbs: asNonNegativeNumber(carbs, 0),
      fat: asNonNegativeNumber(fat, 0),
      notes: notes ? String(notes).trim() : "",
      mealDate: parsedMealDate
    });

    return res.status(201).json(meal);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Get meals for a date or date range
nutritionRouter.get("/meals", requireAuth, async (req, res) => {
  try {
    const { date, startDate, endDate } = req.query;
    let query = { userId: req.auth.userId };

    if (date) {
      const dateObj = new Date(date);
      if (Number.isNaN(dateObj.getTime())) {
        return res.status(400).json({ message: "date is invalid" });
      }
      // Use [start, nextDay) window so timezone offsets do not double-count entries.
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);

      query.mealDate = {
        $gte: dateObj,
        $lt: nextDay
      };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: "startDate or endDate is invalid" });
      }
      query.mealDate = {
        $gte: start,
        $lt: end
      };
    } else {
      // Default to today
      const today = new Date();
      const nextDay = new Date(today);
      nextDay.setDate(nextDay.getDate() + 1);

      query.mealDate = {
        $gte: today.toISOString().split("T")[0],
        $lt: nextDay.toISOString().split("T")[0]
      };
    }

    const meals = await Meal.find(query).sort({ mealDate: -1 }).lean();

    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    meals.forEach((meal) => {
      totals.calories += meal.calories || 0;
      totals.protein += meal.protein || 0;
      totals.carbs += meal.carbs || 0;
      totals.fat += meal.fat || 0;
    });

    return res.json({ meals, totals });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Get nutrition summary for a date range
nutritionRouter.get("/meals/summary", requireAuth, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const parsedDays = Number(days);
    if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365) {
      return res.status(400).json({ message: "days must be an integer between 1 and 365" });
    }
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parsedDays);

    const meals = await Meal.find({
      userId: req.auth.userId,
      mealDate: { $gte: startDate }
    }).lean();

    const dailyData = {};

    meals.forEach((meal) => {
      const dateKey = new Date(meal.mealDate).toISOString().split("T")[0];
      // Bucket by day so chart data is already grouped for the frontend.
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          mealCount: 0
        };
      }
      dailyData[dateKey].calories += meal.calories || 0;
      dailyData[dateKey].protein += meal.protein || 0;
      dailyData[dateKey].carbs += meal.carbs || 0;
      dailyData[dateKey].fat += meal.fat || 0;
      dailyData[dateKey].mealCount += 1;
    });

    const summary = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        ...data
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.json(summary);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Update a meal
nutritionRouter.put("/meals/:mealId", requireAuth, async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.mealId);

    if (!meal) {
      return res.status(404).json({ message: "Meal not found" });
    }

    if (String(meal.userId) !== req.auth.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { name, category, calories, protein, carbs, fat, notes, mealDate } = req.body;

    if (calories !== undefined) {
      const parsedCalories = Number(calories);
      if (Number.isNaN(parsedCalories) || parsedCalories < 0) {
        return res.status(400).json({ message: "calories must be a non-negative number" });
      }
      meal.calories = parsedCalories;
    }

    if (name) meal.name = String(name).trim();
    if (category) meal.category = category;
    if (protein !== undefined) meal.protein = asNonNegativeNumber(protein, meal.protein);
    if (carbs !== undefined) meal.carbs = asNonNegativeNumber(carbs, meal.carbs);
    if (fat !== undefined) meal.fat = asNonNegativeNumber(fat, meal.fat);
    if (notes !== undefined) meal.notes = notes ? String(notes).trim() : "";
    if (mealDate) {
      const parsedMealDate = new Date(mealDate);
      if (Number.isNaN(parsedMealDate.getTime())) {
        return res.status(400).json({ message: "mealDate is invalid" });
      }
      meal.mealDate = parsedMealDate;
    }

    await meal.save();

    return res.json(meal);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

// Delete a meal
nutritionRouter.delete("/meals/:mealId", requireAuth, async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.mealId);

    if (!meal) {
      return res.status(404).json({ message: "Meal not found" });
    }

    if (String(meal.userId) !== req.auth.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    await Meal.deleteOne({ _id: req.params.mealId });

    return res.json({ message: "Meal deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = nutritionRouter;
