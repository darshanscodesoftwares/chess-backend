require("dotenv").config();
const express = require("express");
const cors = require("cors");
const routes = require("./src/routes");
const { connectDB } = require("./src/utils/db");

const app = express();

/* ================== CORS (EXPRESS 5 SAFE) ================== */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("❌ Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

/* =========================================================== */

app.use(express.json());

/* ================== HEALTH CHECK (for UptimeRobot) ================== */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Chess Backend API is running",
    health: "/health"
  });
});
/* ==================================================================== */

app.use("/api", routes);

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
  console.log(`🌍 Allowed origins:`, allowedOrigins.filter(Boolean));
});
