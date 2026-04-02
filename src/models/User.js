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

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["workout_logged", "milestone_reached", "reminder", "achievement"],
      default: "workout_logged"
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      trim: true
    },
    read: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: true }
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
    workouts: {
      type: [workoutEntrySchema],
      default: []
    },
    notifications: {
      type: [notificationSchema],
      default: []
    },
    notificationsEnabled: {
      type: Boolean,
      default: true
    },
    reminderFrequency: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      default: "weekly"
    },
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    bio: {
      type: String,
      trim: true,
      maxlength: 200
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    bodyMeasurements: [
      {
        date: { type: Date, default: Date.now },
        weight: { type: Number, min: 0 },
        waist: { type: Number, min: 0 },
        chest: { type: Number, min: 0 },
        arms: { type: Number, min: 0 },
        legs: { type: Number, min: 0 },
        notes: String
      }
    ],
    goals: [
      {
        title: { type: String, required: true },
        description: String,
        targetValue: Number,
        currentValue: { type: Number, default: 0 },
        unit: String,
        deadline: Date,
        completed: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
      }
    ]
  },
  {
    timestamps: true
  }
);

userSchema.index({ isPublic: 1, createdAt: -1 });
userSchema.index({ "goals.completed": 1 });
userSchema.index({ "bodyMeasurements.date": -1 });

module.exports = mongoose.model("User", userSchema);
