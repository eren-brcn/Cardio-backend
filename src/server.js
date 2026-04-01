const jsonServer = require("json-server");
const cors = require("cors");
require("dotenv").config();

const { connectMongo } = require("./config/db");
const authRouter = require("./routes/auth");
const usersRouter = require("./routes/users");
const adminRouter = require("./routes/admin");
const programRouter = require("./routes/programs");
const { requireAuth } = require("./middleware/auth");

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

// CORS Configuration - Restrictive in production
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "http://localhost:5176",
      "http://localhost:5177",
      "https://cardioweb.vercel.app", // Production frontend URL
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

server.use(cors(corsOptions));
server.use(jsonServer.bodyParser);
server.use(middlewares);

server.use("/auth", authRouter);
server.use("/users", usersRouter);
server.use("/admin", requireAuth, adminRouter);
server.use("/programs", programRouter);
server.use("/admin/programs", requireAuth, programRouter);

server.use(router);

const PORT = Number(process.env.PORT || 10001);

connectMongo().finally(() => {
  const listener = server.listen(PORT, "0.0.0.0", () => {
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
