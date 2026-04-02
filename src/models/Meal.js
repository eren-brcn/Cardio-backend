const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      enum: ["breakfast", "lunch", "dinner", "snack"],
      default: "lunch"
    },
    calories: {
      type: Number,
      min: 0,
      required: true
    },
    protein: {
      type: Number,
      min: 0,
      default: 0
    },
    carbs: {
      type: Number,
      min: 0,
      default: 0
    },
    fat: {
      type: Number,
      min: 0,
      default: 0
    },
    notes: {
      type: String,
      trim: true
    },
    mealDate: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

mealSchema.index({ userId: 1, mealDate: -1 });
mealSchema.index({ userId: 1, category: 1, mealDate: -1 });

module.exports = mongoose.model("Meal", mealSchema);
