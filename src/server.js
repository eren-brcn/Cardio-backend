const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { connectMongo } = require("./config/db");
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const programRouter = require("./routes/programs");
const notificationsRouter = require("./routes/notifications");
const nutritionRouter = require("./routes/nutrition");
const socialRouter = require("./routes/social");
const analyticsRouter = require("./routes/analytics");
const User = require("./models/User");
const { requireAuth } = require("./middleware/auth");

const app = express();

const defaultCategories = [
  {
    id: "1",
    name: "Chest",
    description: "Chest training primarily targets the pectoralis major and minor.",
    benefit: "Improved pushing power and better posture."
  },
  {
    id: "2",
    name: "Back",
    description: "Back training develops lats and upper-back stability.",
    benefit: "Builds a stronger frame and supports spinal health."
  },
  {
    id: "3",
    name: "Legs",
    description: "Leg training includes quads, glutes, hamstrings, and calves.",
    benefit: "Boosts full-body strength and training output."
  },
  {
    id: "4",
    name: "Cardio",
    description: "Cardio improves endurance and cardiovascular fitness.",
    benefit: "Increases stamina and heart health."
  },
  {
    id: "5",
    name: "Yoga",
    description: "Yoga supports mobility, flexibility, and recovery.",
    benefit: "Improves movement quality and reduces stiffness."
  }
];

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
      "https://cardioweb.vercel.app",
      process.env.FRONTEND_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again later." }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false
});

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many write requests. Please try again later." }
});

const serverStartedAt = Date.now();
const metrics = {
  totalRequests: 0,
  byMethod: { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OPTIONS: 0 },
  byStatusFamily: { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 }
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(apiLimiter);
app.use((req, res, next) => {
  // Lightweight in-memory counters for quick operational visibility.
  metrics.totalRequests += 1;
  metrics.byMethod[req.method] = (metrics.byMethod[req.method] || 0) + 1;

  res.on("finish", () => {
    const family = `${Math.floor(res.statusCode / 100)}xx`;
    metrics.byStatusFamily[family] = (metrics.byStatusFamily[family] || 0) + 1;
  });

  next();
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "cardio-backend",
    timestamp: new Date().toISOString()
  });
});

app.get("/metrics", (_req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - serverStartedAt) / 1000);
  res.json({
    service: "cardio-backend",
    uptimeSeconds,
    requests: metrics,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.get("/categories", (_req, res) => {
  res.json(defaultCategories);
});

app.get("/exercises", requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Keep the latest logged weight per exercise/category pair.
    const byExercise = new Map();
    (user.workouts || []).forEach((entry) => {
      const title = String(entry.exerciseName || "").trim();
      if (!title) {
        return;
      }

      const category = String(entry.category || "General").trim();
      const key = `${title.toLowerCase()}::${category.toLowerCase()}`;
      const existing = byExercise.get(key);
      const candidate = {
        id: key,
        title,
        category,
        currentWeight: Number(entry.currentWeight || 0),
        workoutDate: entry.workoutDate || null
      };

      if (!existing || new Date(candidate.workoutDate).getTime() >= new Date(existing.workoutDate).getTime()) {
        byExercise.set(key, candidate);
      }
    });

    const exercises = [...byExercise.values()].sort((a, b) =>
      String(a.title).localeCompare(String(b.title))
    );

    return res.json(exercises);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.post("/exercises", requireAuth, async (req, res) => {
  try {
    const title = String(req.body.title || "").trim();
    const category = String(req.body.category || "General").trim();
    const currentWeight = Number(req.body.currentWeight || 0);

    if (!title) {
      return res.status(400).json({ message: "title is required" });
    }

    if (Number.isNaN(currentWeight) || currentWeight < 0) {
      return res.status(400).json({ message: "currentWeight must be a positive number" });
    }

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.workouts.push({
      exerciseName: title,
      category,
      currentWeight,
      reps: Number(req.body.reps || 0),
      sets: Number(req.body.sets || 0),
      workoutDate: req.body.workoutDate || new Date().toISOString()
    });

    await user.save();

    return res.status(201).json({
      id: `${title.toLowerCase()}::${category.toLowerCase()}`,
      title,
      category,
      currentWeight
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.delete("/exercises/:exerciseId", requireAuth, async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const [titleKey, categoryKey] = String(exerciseId).split("::");

    const user = await User.findById(req.auth.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const initialCount = user.workouts.length;
    user.workouts = user.workouts.filter((entry) => {
      const title = String(entry.exerciseName || "").trim().toLowerCase();
      const category = String(entry.category || "General").trim().toLowerCase();
      return !(title === titleKey && category === categoryKey);
    });

    if (user.workouts.length === initialCount) {
      return res.status(404).json({ message: "Exercise not found" });
    }

    await user.save();
    return res.json({ message: "Exercise deleted" });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

app.use("/auth", authLimiter, authRouter);
app.use("/users", usersRouter);
app.use("/programs", requireAuth, programRouter);
app.use("/notifications", requireAuth, notificationsRouter);
// Write-heavy routes get an extra limiter to reduce accidental or abusive bursts.
app.use("/nutrition", requireAuth, writeLimiter, nutritionRouter);
app.use("/social", socialRouter);
app.use("/analytics", requireAuth, writeLimiter, analyticsRouter);

app.use((err, _req, res, _next) => {
  if (err?.message === "Not allowed by CORS") {
    return res.status(403).json({ message: err.message });
  }

  return res.status(500).json({ message: "Internal server error" });
});

const PORT = Number(process.env.PORT || 10001);

connectMongo().finally(() => {
  const listener = app.listen(PORT, "0.0.0.0", () => {
    console.log(`API server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });

  listener.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Stop the process using it or run npm run dev.`);
      process.exit(1);
    }

    throw err;
  });
});
