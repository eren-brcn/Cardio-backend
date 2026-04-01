const mongoose = require("mongoose");

const workoutPhaseSchema = new mongoose.Schema(
  {
    week: { type: Number, required: true },
    description: { type: String, trim: true },
    exercises: [
      {
        name: { type: String, required: true, trim: true },
        sets: { type: Number, min: 1, default: 3 },
        reps: { type: Number, min: 1, default: 8 },
        intensity: { type: String, enum: ["low", "medium", "high"], default: "medium" }
      }
    ]
  },
  { _id: false }
);

const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      default: 12
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate"
    },
    phases: [workoutPhaseSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    assignedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("WorkoutProgram", programSchema);
