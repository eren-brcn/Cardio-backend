const mongoose = require("mongoose");

const workoutEntrySchema = new mongoose.Schema(
  {
    exerciseName: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      default: "General"
    },
    currentWeight: {
      type: Number,
      required: true,
      min: 0
    },
    reps: {
      type: Number,
      min: 0,
      default: 0
    },
    sets: {
      type: Number,
      min: 0,
      default: 0
    },
    workoutDate: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    workouts: {
      type: [workoutEntrySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);
